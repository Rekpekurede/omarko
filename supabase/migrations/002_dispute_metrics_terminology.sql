-- Migration: Dispute metrics, terminology (DISPUTED), outcome tracking
-- Run in Supabase SQL Editor

-- marks: dispute metrics
ALTER TABLE marks ADD COLUMN IF NOT EXISTS dispute_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marks ADD COLUMN IF NOT EXISTS disputes_survived INTEGER NOT NULL DEFAULT 0;

-- profiles: dispute outcome tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disputes_raised INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disputes_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disputes_lost INTEGER NOT NULL DEFAULT 0;

-- Backfill dispute_count for existing marks
UPDATE marks SET dispute_count = (SELECT COUNT(*) FROM challenges WHERE challenges.mark_id = marks.id);
UPDATE profiles p SET disputes_raised = (SELECT COUNT(*) FROM challenges WHERE challenger_id = p.id);

-- Update trigger: set DISPUTED (not CHALLENGED) when dispute added
CREATE OR REPLACE FUNCTION public.set_mark_disputed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marks SET
    status = 'DISPUTED',
    dispute_count = dispute_count + 1,
    updated_at = NOW()
  WHERE id = NEW.mark_id AND status NOT IN ('CHAMPION', 'SUPPLANTED');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_created ON challenges;
CREATE TRIGGER on_challenge_created
  AFTER INSERT ON challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_mark_disputed();

-- Update disputes_raised when user files a dispute (challenge)
CREATE OR REPLACE FUNCTION public.increment_disputes_raised()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET disputes_raised = disputes_raised + 1 WHERE id = NEW.challenger_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_disputes_raised ON challenges;
CREATE TRIGGER on_challenge_disputes_raised
  AFTER INSERT ON challenges
  FOR EACH ROW EXECUTE FUNCTION public.increment_disputes_raised();

-- Replace set_mark_disputed: we need dispute_count incremented separately since trigger fires before we'd have it
-- Actually the old trigger set_mark_challenged just set status. Our new one increments dispute_count.
-- But dispute_count is in marks - so we need to NOT double-count. The old schema had no dispute_count.
-- New logic: on challenge insert, we set status DISPUTED and increment dispute_count. One trigger can do both.
-- Wait - we're updating marks and setting dispute_count = dispute_count + 1. Good.

-- But we're also adding a trigger that increments disputes_raised on profiles. So we have two triggers on challenges:
-- 1. set_mark_disputed - updates mark
-- 2. increment_disputes_raised - updates disputer's profile
-- Good.

-- compute_mark_status: update for new status rules and dispute outcomes
-- Status: oppose - support >= 10 -> SUPPLANTED; support - oppose >= 10 -> CHAMPION; else dispute_count > 0 -> DISPUTED; else ACTIVE
CREATE OR REPLACE FUNCTION public.compute_mark_status(mark_uuid UUID)
RETURNS void AS $$
DECLARE
  support_count INT;
  oppose_count INT;
  dispute_ct INT;
  new_status mark_status;
  old_status mark_status;
  mark_owner_id UUID;
  threshold INT := 10;
  rec RECORD;
BEGIN
  SELECT status, user_id, dispute_count INTO old_status, mark_owner_id, dispute_ct
  FROM marks WHERE id = mark_uuid;
  IF NOT FOUND THEN RETURN; END IF;
  IF old_status = 'CHAMPION' OR old_status = 'SUPPLANTED' THEN
    RETURN; -- terminal states
  END IF;

  SELECT COUNT(*) FILTER (WHERE vote_type = 'SUPPORT'), COUNT(*) FILTER (WHERE vote_type = 'OPPOSE')
  INTO support_count, oppose_count FROM votes WHERE mark_id = mark_uuid;

  -- Status rules
  IF (oppose_count - support_count) >= threshold THEN
    new_status := 'SUPPLANTED';
  ELSIF (support_count - oppose_count) >= threshold THEN
    new_status := 'CHAMPION';
  ELSIF dispute_ct > 0 THEN
    new_status := 'DISPUTED';
  ELSE
    new_status := 'ACTIVE';
  END IF;

  -- Update mark
  UPDATE marks SET
    status = new_status,
    support_votes = support_count,
    oppose_votes = oppose_count,
    endorsements_count = support_count,
    updated_at = NOW()
  WHERE id = mark_uuid;

  -- SUPPLANTED: owner gets disputes_lost, all challengers get disputes_won
  IF new_status = 'SUPPLANTED' AND old_status != 'SUPPLANTED' THEN
    UPDATE profiles SET disputes_lost = disputes_lost + 1 WHERE id = mark_owner_id;
    FOR rec IN SELECT challenger_id FROM challenges WHERE mark_id = mark_uuid
    LOOP
      UPDATE profiles SET disputes_won = disputes_won + 1 WHERE id = rec.challenger_id;
    END LOOP;
  END IF;

  -- Survived (was DISPUTED, now CHAMPION): disputes_survived++, owner disputes_won, challengers disputes_lost
  IF new_status = 'CHAMPION' AND old_status = 'DISPUTED' THEN
    UPDATE marks SET disputes_survived = disputes_survived + 1 WHERE id = mark_uuid;
    UPDATE profiles SET disputes_won = disputes_won + 1 WHERE id = mark_owner_id;
    FOR rec IN SELECT challenger_id FROM challenges WHERE mark_id = mark_uuid
    LOOP
      UPDATE profiles SET disputes_lost = disputes_lost + 1 WHERE id = rec.challenger_id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
