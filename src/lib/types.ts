export type MarkStatus =
  | 'ACTIVE'
  | 'CHALLENGED'
  | 'DISPUTED'
  | 'CHAMPION'
  | 'SUPPLANTED';

export type VoteType = 'SUPPORT' | 'OPPOSE';

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url?: string | null;
  profile_type?: 'user' | 'historical' | 'admin';
  disputes_raised?: number;
  disputes_won?: number;
  disputes_lost?: number;
  disputes_conceded?: number;
  created_at: string;
  updated_at: string;
}

export interface HistoricalProfile {
  id: string;
  name: string;
  bio: string | null;
  era: string | null;
  domain: string | null;
  avatar_url: string | null;
  created_at: string;
}

/** Supabase may return profiles as object or array for relation */
export type MarkProfile = Pick<Profile, 'username' | 'avatar_url'> | Pick<Profile, 'username' | 'avatar_url'>[];

export const DOMAINS = ['Music', 'Dance', 'Literature', 'VisualArt', 'Architecture', 'Politics', 'Business', 'Technology', 'Science', 'Sport', 'Law', 'Culture', 'Food', 'Philosophy', 'General'] as const;
export const CLAIM_TYPES = ['Creation', 'Prediction', 'Implementation', 'Discovery', 'Innovation', 'Strategy', 'Record', 'Invite'] as const;
export type Domain = (typeof DOMAINS)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];

export type NotificationType = 'DISPUTE_CREATED' | 'MARK_SUPPLANTED' | 'MARK_CHAMPION' | 'MARK_WITHDRAWN' | 'COMMENT_CREATED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  mark_id: string | null;
  actor_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface CommentPreview {
  username: string;
  content: string;
  created_at: string;
}

export interface Mark {
  id: string;
  user_id: string;
  historical_profile_id?: string | null;
  title?: string | null;
  content: string;
  image_url?: string | null;
  category: string;
  domain: string;
  claim_type: string;
  status: MarkStatus;
  endorsements_count?: number;
  support_votes?: number;
  oppose_votes?: number;
  dispute_count?: number;
  disputes_survived?: number;
  withdrawn_at?: string | null;
  withdrawn_by?: string | null;
  owner_response?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: MarkProfile | null;
  historical_profiles?: Pick<HistoricalProfile, 'name'> | null;
  comments_count?: number;
  soi_count?: number;
  latest_comments?: CommentPreview[];
}

export type ChallengeOutcome = 'PENDING' | 'WON' | 'LOST' | 'CONCEDED' | 'WITHDRAWN';

export interface Challenge {
  id: string;
  mark_id: string;
  challenger_id: string;
  evidence_text: string;
  evidence_url?: string | null;
  claimed_original_date?: string | null;
  is_evidence_backed: boolean;
  outcome: ChallengeOutcome;
  resolved_at?: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'username'> | null;
}

export interface Comment {
  id: string;
  mark_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, 'username'> | null;
}

export interface Vote {
  id: string;
  mark_id: string;
  voter_id: string;
  vote_type: VoteType;
  created_at: string;
}

export const VOTE_THRESHOLD = 10;
