# Production Stabilization Checklist — Votes & Comment Notifications

## TASK A — Fix Votes (Production Safe)

### Step 1: Inspect Schema

**What to check:** votes table structure, enum, unique constraint, indexes, RLS policies.

**SQL to run:**
```sql
-- 1) votes table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'votes'
ORDER BY ordinal_position;

-- 2) vote_type enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vote_type')
ORDER BY enumsortorder;

-- 3) Unique constraints and indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'votes';

-- 4) RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'votes';
```

**Expected result:**
- Columns: `id`, `mark_id`, `voter_id`, `vote_type`, `created_at`
- `vote_type` uses enum `vote_type` with values `SUPPORT`, `OPPOSE`
- Unique constraint on `(mark_id, voter_id)` (or unique index)
- RLS: SELECT (all), INSERT (own), UPDATE (own), DELETE (own)

---

### Step 2: Identify Enum Mismatch

**What to check:** DB enum vs frontend vs API.

**Current state:**
- DB: `vote_type` enum `('SUPPORT', 'OPPOSE')` — uppercase
- Frontend: `'SUPPORT' | 'OPPOSE'`
- API: normalizes `raw.toUpperCase()` before use

**Conclusion:** No mismatch. Standard is `SUPPORT`/`OPPOSE` everywhere.

**If you ever need to normalize (e.g. lowercase in DB):**
```sql
-- NOT NEEDED for current schema. Only if DB had lowercase.
-- ALTER TYPE vote_type RENAME VALUE 'support' TO 'SUPPORT';
-- ALTER TYPE vote_type RENAME VALUE 'oppose' TO 'OPPOSE';
```

---

### Step 3: Harden RLS for Votes

**What to check:** Policies allow correct operations.

**SQL to run (inspect current):**
```sql
SELECT policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'votes';
```

**Fix if broken — apply migration `014_votes_comment_notifications.sql`** (see below).

**RLS summary:**
| Operation | Policy | Logic |
|-----------|--------|-------|
| SELECT | Votes viewable | `true` (public read) |
| INSERT | Authenticated users can vote | `auth.uid() = voter_id` |
| UPDATE | Users can update own vote | `auth.uid() = voter_id` (USING + WITH CHECK) |
| DELETE | Users can delete own vote | `auth.uid() = voter_id` |

**SECURITY DEFINER alternative:** Not needed. RLS is sufficient. Vote logic stays in API; `compute_mark_status` is already SECURITY DEFINER.

---

### Step 4: Fix API Route Logging + UI

**What to check:** Vote route logs payload and Supabase errors; returns structured JSON; UI updates only after success (no optimistic update before confirmation).

**Fix applied:**
- **API:** Logs payload + `error.message`, `error.code`, `error.details`; returns `{ error, code? }` on failure
- **UI:** VoteButtons and MarkCard use **pessimistic update** — only update local state after `res.ok`. Revert only on explicit error (no premature revert)

---

## TASK B — Comment Notifications (Reliable + DB-Driven)

### Step 1: Confirm comments table schema

**SQL to run:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'comments'
ORDER BY ordinal_position;
```

**Expected result:**
- `id` (uuid)
- `mark_id` (uuid) → marks.id
- `user_id` (uuid) → profiles.id (commenter/author)
- `content` (text)
- `created_at` (timestamptz)

**Note:** `user_id` = commenter. Mark owner = `marks.user_id` (from `mark_id`).

---

### Step 2: Create Notification Trigger

**What to do:** Add `COMMENT_CREATED` type, create trigger on `comments` AFTER INSERT.

**Fix:** See migration `014_votes_comment_notifications.sql` (below).

**Logic:**
1. Get mark owner: `SELECT user_id FROM marks WHERE id = NEW.mark_id`
2. Skip if commenter = mark owner (no self-notify)
3. Insert notification: `create_notification(mark_owner_id, 'COMMENT_CREATED', mark_id, actor_id=commenter_id, message)`

---

### Step 3: Handle RLS for Notifications

**What to check:**
- Users can read only their own notifications ✓ (existing policy)
- Insert via trigger: `create_notification` is SECURITY DEFINER ✓ (bypasses RLS for insert)

**Conclusion:** No change needed. Trigger calls `create_notification` which runs as definer.

---

## Migration File

Run `web/supabase/migrations/014_votes_comment_notifications.sql` in Supabase SQL Editor.
