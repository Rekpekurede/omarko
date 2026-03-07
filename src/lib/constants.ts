/** Single source of truth for claim types. Import here everywhere claim types are needed. */
export const CLAIM_TYPES = [
  'Creation',
  'Prediction',
  'Discovery',
  'Event',
  'Innovation',
  'Strategy',
  'Record',
  'Implementation',
  'Invite',
  'Quote',
  'Concept',
  'Method',
  'Theory',
  'Phrase',
  'Formula',
  'Design',
  'Movement',
  'Observation',
  'Perspective',
  'Trend',
  'Story',
  'Joke',
  'Defense',
] as const;

export type ClaimType = (typeof CLAIM_TYPES)[number];
