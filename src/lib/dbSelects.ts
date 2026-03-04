/** Explicit FK for marks.user_id -> profiles (avoids embed ambiguity with marks.withdrawn_by) */
export const MARK_OWNER_PROFILE = 'profiles!marks_user_id_fkey(username, avatar_url)';
export const MARK_CLAIM_TYPE = 'claim_types(name)';

/** Standard mark select with owner username */
export const MARK_WITH_OWNER_USERNAME_SELECT = `id, user_id, title, content, image_url, category, domain, claim_type, claim_type_id, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at, ${MARK_OWNER_PROFILE}, ${MARK_CLAIM_TYPE}`;
