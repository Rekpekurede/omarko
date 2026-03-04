# OMarko Web (V1 MVP)

Next.js 14 frontend for OMarko — a social platform for timestamped claims (Marks) that can be challenged and voted on.

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** (Auth + Postgres)
- **Tailwind CSS**

## Setup

### 1. Environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (Project Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key

### 2. Database schema

In the [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**:

1. Run `supabase/schema.sql` (for fresh install).
2. If you already have the base schema, run in order: `supabase/migrations/001_add_support_oppose_reputation.sql`, then `supabase/migrations/002_dispute_metrics_terminology.sql`.

This creates:

- `profiles` (extends auth users; disputes_raised, disputes_won, disputes_lost)
- `marks` (claims; support_votes, oppose_votes, dispute_count, disputes_survived)
- `challenges` (dispute content)
- `votes`
- RLS policies, triggers (profile on signup, dispute count/status, status + outcome tracking)

### 3. Auth settings (optional)

- In Supabase → **Authentication** → **URL Configuration**, set **Site URL** to `http://localhost:3000` for local dev.
- Add **Redirect URL**: `http://localhost:3000/auth/callback` if you use email confirmation.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Feed**: `/`
- **Create Mark**: `/create` (requires sign in)
- **Mark detail**: `/mark/[id]`
- **Profile**: `/profile/[username]`
- **Auth**: `/auth`

## Folder structure / file paths (MVP upgrade)

```
supabase/
  schema.sql
  migrations/
    001_add_support_oppose_reputation.sql
    002_dispute_metrics_terminology.sql    # dispute_count, disputes_survived, profile dispute fields, DISPUTED status, outcome tracking

src/app/
  api/marks/
    route.ts                              # POST: create mark (content, category; auto title)
    [id]/vote/route.ts                    # POST: vote; recalc tallies + status; return mark
    [id]/dispute/route.ts                 # POST: dispute (insert challenge); return mark
  create/page.tsx                        # "Your Mark", CreateMarkForm with checkbox
  page.tsx                               # Feed; selects dispute_count, disputes_survived
  mark/[id]/page.tsx                     # Detail; Support/Oppose/Disputes/Survived; Dispute section
  profile/[username]/page.tsx            # Marks created, Champions, Supplanted, Disputes raised/won/lost

src/components/
  CreateMarkForm.tsx                     # No title; Content + category; checkbox; "Submit Claim"; warning
  MarkCard.tsx                           # "Mark from @username"; Support, Oppose, Disputes, Survived; Dispute button
  VoteButtons.tsx                        # Calls /api/marks/[id]/vote; 401/400/409 errors; router.refresh()
  ChallengeForm.tsx                      # Calls /api/marks/[id]/dispute; label "Challenge", button "Dispute"
  StatusBadge.tsx                        # ACTIVE, DISPUTED, CHAMPION, SUPPLANTED (and CHALLENGED for legacy)

src/lib/
  types.ts                               # Mark: dispute_count, disputes_survived; Profile: disputes_raised, disputes_won, disputes_lost
```

## Status logic (V1)

- New mark → **ACTIVE**
- At least one dispute → **DISPUTED**
- support_votes − oppose_votes ≥ 10 → **CHAMPION**
- oppose_votes − support_votes ≥ 10 → **SUPPLANTED**

Status and tallies are recomputed in DB via `compute_mark_status(mark_uuid)` after each vote. Dispute outcomes update profiles (disputes_won, disputes_lost) and marks.disputes_survived.

## API (Route Handlers)

- **POST /api/marks** – Create mark (content, category; title = first 60 chars of content).
- **POST /api/marks/[id]/vote** – Vote (vote_type: SUPPORT | OPPOSE). Returns updated mark.
- **POST /api/marks/[id]/dispute** – Dispute (evidence_text = challenge content). Returns updated mark.

## Manual testing checklist

1. **Auth** – Sign up, sign in, sign out.
2. **Create Mark** – `/create` ("Your Mark"). Must be logged in. Check the acceptance checkbox, submit content + category ("Submit Claim"). Title is auto-generated. Redirects to mark detail.
3. **Feed** – `/` shows "Mark from @username", Support/Oppose/Disputes/Survived, status badge, Dispute button. Filter by category.
4. **Mark detail** – Support, Oppose, Disputes, Survived; vote buttons (if logged in and not author). Dispute section with "Challenge" field and "Dispute" button.
5. **Vote** – Support or Oppose. 401 if not signed in; 409 if already voted; 403 if own mark. Tallies and status update after vote; refresh shows new counts.
6. **Dispute** – Submit challenge text. Cannot dispute own mark; 409 if already disputed. Mark becomes DISPUTED; dispute_count and disputes_raised update.
7. **Profile** – Marks created, Champions, Supplanted, Disputes raised, Disputes won, Disputes lost. Marks list with same card as feed.

### Withdrawn marks (MVP)

1. **User A creates mark** – Create a mark as User A.
2. **User B disputes** – As User B, open the mark and submit a dispute (challenge). Mark becomes DISPUTED.
3. **User A withdraws** – As User A, open the mark; see “This mark is disputed” with **Withdraw** and **Contest** buttons. Click **Withdraw**. Mark shows WITHDRAWN badge and “Withdrawn by @userA”.
4. **User B with direct link** – User B opens the same mark via direct link. Sees WITHDRAWN badge and “Withdrawn by @userA”. Vote and Dispute are disabled (message: “Voting and disputing disabled”).
5. **Public profile** – View User A’s profile as public (or as User B). Withdrawn mark does **not** appear in the main Marks list.
6. **User A “My Withdrawn”** – As User A, go to own profile. Section **My Withdrawn** lists only that withdrawn mark (with small WITHDRAWN badge on the card).

### Notifications checklist

1. **User A posts mark** – Create a mark as User A.
2. **User B supports/comments/disputes** – As User B, support the mark, comment on it, and raise a dispute. User A should see alerts in `/notifications`.
3. **User B follows User A** – User A should receive a follow alert.
4. **No self notification** – As User A, support/comment on your own mark (if allowed). No alert should be created for User A.
5. **Unread count** – Bell badge should show unread count; opening Alerts marks items read and updates the badge.
