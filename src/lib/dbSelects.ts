/** Explicit FK for marks.user_id -> profiles (avoids embed ambiguity with marks.withdrawn_by) */
export const MARK_OWNER_PROFILE = 'profiles!marks_user_id_fkey(username, avatar_url, display_name)';

/** Standard mark select with owner username and optional historical figure */
export const MARK_WITH_OWNER_USERNAME_SELECT = `id, user_id, historical_profile_id, title, content, image_url, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at, ${MARK_OWNER_PROFILE}, historical_profiles(name)`;
