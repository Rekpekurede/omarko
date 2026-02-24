-- OMarko V1 Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enum types
CREATE TYPE mark_status AS ENUM (
  'ACTIVE',
  'CHALLENGED',
  'DISPUTED',
  'CHAMPION',
  'SUPPLANTED'
);

CREATE TYPE vote_type AS ENUM ('SUPPORT', 'OPPOSE');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  reputation_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marks (claims)
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  status mark_status NOT NULL DEFAULT 'ACTIVE',
  endorsements_count INTEGER NOT NULL DEFAULT 0,
  support_votes INTEGER NOT NULL DEFAULT 0,
  oppose_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marks_user_id ON marks(user_id);
CREATE INDEX idx_marks_category ON marks(category);
CREATE INDEX idx_marks_status ON marks(status);
CREATE INDEX idx_marks_created_at ON marks(created_at DESC);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES marks(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mark_id, challenger_id)
);

-- Prevent challenging own mark
CREATE OR REPLACE FUNCTION public.check_challenge_not_own_mark()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM marks WHERE id = NEW.mark_id AND user_id = NEW.challenger_id) THEN
    RAISE EXCEPTION 'Cannot challenge your own mark';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_not_own_mark
  BEFORE INSERT ON challenges
  FOR EACH ROW EXECUTE FUNCTION public.check_challenge_not_own_mark();

CREATE INDEX idx_challenges_mark_id ON challenges(mark_id);

-- Votes (one per user per mark)
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES marks(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mark_id, voter_id)
);

CREATE INDEX idx_votes_mark_id ON votes(mark_id);

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

CREATE TRIGGER vote_not_own_mark
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION public.check_vote_not_own_mark();

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update mark status when challenge is added
CREATE OR REPLACE FUNCTION public.set_mark_challenged()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marks SET status = 'CHALLENGED', updated_at = NOW() WHERE id = NEW.mark_id AND status = 'ACTIVE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_challenge_created
  AFTER INSERT ON challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_mark_challenged();

-- Trigger: update marks.updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER marks_updated_at BEFORE UPDATE ON marks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Marks: public read, authenticated insert/update (own only for update)
CREATE POLICY "Marks are viewable by everyone" ON marks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create marks" ON marks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own marks" ON marks FOR UPDATE USING (auth.uid() = user_id);

-- Challenges: public read, authenticated insert (not own mark)
CREATE POLICY "Challenges are viewable by everyone" ON challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- Votes: public read, authenticated insert (one per user per mark enforced by UNIQUE)
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Function to recompute mark status from votes (call from app after vote)
-- Sets support_votes, oppose_votes, status; updates reputation on CHAMPION/SUPPLANTED
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

  UPDATE marks SET
    status = new_status,
    support_votes = support_count,
    oppose_votes = oppose_count,
    endorsements_count = support_count,
    updated_at = NOW()
  WHERE id = mark_uuid;

  IF new_status = 'CHAMPION' AND old_status != 'CHAMPION' THEN
    UPDATE profiles SET reputation_score = reputation_score + 5 WHERE id = mark_owner_id;
  ELSIF new_status = 'SUPPLANTED' AND old_status != 'SUPPLANTED' THEN
    UPDATE profiles SET reputation_score = GREATEST(0, reputation_score - 5) WHERE id = mark_owner_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
