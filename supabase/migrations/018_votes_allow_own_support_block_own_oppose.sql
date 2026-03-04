-- Migration: allow SUPPORT on own marks, block OPPOSE on own marks

CREATE OR REPLACE FUNCTION public.check_vote_not_own_mark()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote_type = 'OPPOSE'
     AND EXISTS (SELECT 1 FROM public.marks WHERE id = NEW.mark_id AND user_id = NEW.voter_id) THEN
    RAISE EXCEPTION 'You cannot oppose your own mark';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vote_not_own_mark ON public.votes;
CREATE TRIGGER vote_not_own_mark
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.check_vote_not_own_mark();
