-- Migration: Add support_votes, oppose_votes; reputation updates; prevent self-vote
-- Run in Supabase SQL Editor if you already have the base schema

-- Add support_votes and oppose_votes to marks
ALTER TABLE marks ADD COLUMN IF NOT EXISTS support_votes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marks ADD COLUMN IF NOT EXISTS oppose_votes INTEGER NOT NULL DEFAULT 0;

-- Backfill from votes table (run once)
UPDATE marks m SET
  support_votes = (SELECT COUNT(*) FROM votes v WHERE v.mark_id = m.id AND v.vote_type = 'SUPPORT'),
  oppose_votes = (SELECT COUNT(*) FROM votes v WHERE v.mark_id = m.id AND v.vote_type = 'OPPOSE')
WHERE support_votes = 0 AND oppose_votes = 0;

-- Prevent voting on own mark
CREATE OR REPLACE FUNCTION public.check_vote_not_own_mark()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM marks WHERE id = NEW.mark_id AND user_id = NEW.voter_id) THEN
    RAISE EXCEPTION 'Cannot vote on your own mark';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vote_not_own_mark ON votes;
CREATE TRIGGER vote_not_own_mark
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION public.check_vote_not_own_mark();

-- Replace compute_mark_status: set support_votes, oppose_votes, status, reputation
CREATE OR REPLACE FUNCTION public.compute_mark_status(mark_uuid UUID)
RETURNS void AS $$
DECLARE
  support_count INT;
  oppose_count INT;
  challenge_count INT;
  new_status mark_status;
  old_status mark_status;
  mark_owner_id UUID;
  threshold INT := 10;
BEGIN
  SELECT status, user_id INTO old_status, mark_owner_id FROM marks WHERE id = mark_uuid;
  IF NOT FOUND THEN RETURN; END IF;
  IF old_status = 'CHAMPION' OR old_status = 'SUPPLANTED' THEN
    RETURN; -- terminal states
  END IF;

  SELECT COUNT(*) FILTER (WHERE vote_type = 'SUPPORT'), COUNT(*) FILTER (WHERE vote_type = 'OPPOSE')
  INTO support_count, oppose_count FROM votes WHERE mark_id = mark_uuid;
  SELECT COUNT(*) INTO challenge_count FROM challenges WHERE mark_id = mark_uuid;

  IF challenge_count > 0 THEN
    IF (support_count - oppose_count) >= threshold THEN
      new_status := 'CHAMPION';
    ELSIF (oppose_count - support_count) >= threshold THEN
      new_status := 'SUPPLANTED';
    ELSE
      new_status := 'CHALLENGED';
    END IF;
  ELSE
    IF (support_count - oppose_count) >= threshold THEN
      new_status := 'CHAMPION';
    ELSIF (oppose_count - support_count) >= threshold THEN
      new_status := 'SUPPLANTED';
    ELSE
      new_status := 'ACTIVE';
    END IF;
  END IF;

  -- Update mark with counts and status
  UPDATE marks SET
    status = new_status,
    support_votes = support_count,
    oppose_votes = oppose_count,
    endorsements_count = support_count,
    updated_at = NOW()
  WHERE id = mark_uuid;

  -- Reputation: +5 on CHAMPION, -5 on SUPPLANTED (only when status changes)
  IF new_status = 'CHAMPION' AND old_status != 'CHAMPION' THEN
    UPDATE profiles SET reputation_score = reputation_score + 5 WHERE id = mark_owner_id;
  ELSIF new_status = 'SUPPLANTED' AND old_status != 'SUPPLANTED' THEN
    UPDATE profiles SET reputation_score = GREATEST(0, reputation_score - 5) WHERE id = mark_owner_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
