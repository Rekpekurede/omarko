-- Drop all overloads so only one insert_challenge exists (avoid "could not choose best candidate").
DROP FUNCTION IF EXISTS public.insert_challenge(UUID, DATE, TEXT, TEXT, BOOLEAN, UUID, TEXT);
DROP FUNCTION IF EXISTS public.insert_challenge(UUID, TEXT, UUID, DATE, TEXT, BOOLEAN, TEXT);

-- RPC to insert a challenge with explicit parameters so DATE/boolean are never mixed by the client.
-- All params have DEFAULT so order can be alphabetical (matches PostgREST when it sends keys A–Z).
CREATE OR REPLACE FUNCTION public.insert_challenge(
  p_challenger_id UUID DEFAULT NULL,
  p_claimed_original_date DATE DEFAULT NULL,
  p_evidence_text TEXT DEFAULT NULL,
  p_evidence_url TEXT DEFAULT NULL,
  p_is_evidence_backed BOOLEAN DEFAULT false,
  p_mark_id UUID DEFAULT NULL,
  p_outcome TEXT DEFAULT 'PENDING'
)
RETURNS SETOF public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_challenger_id IS NULL OR p_evidence_text IS NULL OR p_mark_id IS NULL THEN
    RAISE EXCEPTION 'challenger_id, evidence_text and mark_id are required';
  END IF;
  RETURN QUERY
  INSERT INTO public.challenges (
    mark_id,
    challenger_id,
    evidence_text,
    evidence_url,
    claimed_original_date,
    is_evidence_backed,
    outcome
  )
  VALUES (
    p_mark_id,
    p_challenger_id,
    p_evidence_text,
    p_evidence_url,
    p_claimed_original_date,
    p_is_evidence_backed,
    p_outcome
  )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_challenge(UUID, DATE, TEXT, TEXT, BOOLEAN, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_challenge(UUID, DATE, TEXT, TEXT, BOOLEAN, UUID, TEXT) TO service_role;
