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
  default_domain?: string | null;
  default_claim_type?: string | null;
  disputes_raised?: number;
  disputes_won?: number;
  disputes_lost?: number;
  disputes_conceded?: number;
  created_at: string;
  updated_at: string;
}

/** Supabase may return profiles as object or array for relation */
export type MarkProfile = Pick<Profile, 'username' | 'avatar_url'> | Pick<Profile, 'username' | 'avatar_url'>[];

export const DOMAINS = ['Music', 'Dance', 'Literature', 'VisualArt', 'Architecture', 'Politics', 'Business', 'Technology', 'Science', 'Sport', 'Law', 'Culture', 'Food', 'Philosophy', 'General'] as const;
export const CLAIM_TYPES = ['Creation', 'Discovery', 'Prediction', 'Plan', 'Teaching', 'Conviction', 'Strategy'] as const;
export type Domain = (typeof DOMAINS)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_TYPE_HELP: Record<ClaimType, { description: string; example: string }> = {
  Creation: {
    description: 'Use when you are claiming you created or produced something original.',
    example: 'I wrote this poem.',
  },
  Discovery: {
    description: 'Use when you are claiming you were the first to realise or uncover something.',
    example: 'Air fryers produce healthier fried chicken.',
  },
  Prediction: {
    description: 'Use when you are claiming a future outcome before it happens.',
    example: 'This startup will become profitable within a year.',
  },
  Plan: {
    description: 'Use when you are proposing a course of action or idea.',
    example: 'This city should replace buses with electric trams.',
  },
  Teaching: {
    description: 'Use when you are explaining knowledge or guiding others.',
    example: 'Prayer should be private rather than performative.',
  },
  Conviction: {
    description: 'Use when you are expressing a deeply held belief.',
    example: 'Forgiveness is more powerful than revenge.',
  },
  Strategy: {
    description: 'Use when you are claiming an intentional approach for achieving a goal.',
    example: 'We should focus on local partnerships before paid ads.',
  },
};

export type NotificationType =
  | 'comment'
  | 'vote_support'
  | 'vote_oppose'
  | 'dispute_raised'
  | 'follow'
  | 'DISPUTE_CREATED'
  | 'MARK_SUPPLANTED'
  | 'MARK_CHAMPION'
  | 'MARK_WITHDRAWN'
  | 'COMMENT_CREATED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  mark_id: string | null;
  actor_id: string | null;
  actor_username?: string | null;
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
  title?: string | null;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  category: string;
  domain: string;
  claim_type: string;
  claim_type_id?: string | null;
  claim_types?: { name: string } | { name: string }[] | null;
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
  comments_count?: number;
  soi_count?: number;
  media?: Array<{
    id: string;
    kind: 'image' | 'audio' | 'video';
    mime_type: string;
    path: string;
    size_bytes: number;
    duration_ms?: number | null;
    width?: number | null;
    height?: number | null;
    poster_path?: string | null;
    signed_url?: string | null;
    poster_signed_url?: string | null;
  }>;
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
