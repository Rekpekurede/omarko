# Manual test checklist — Domain, Claim Type, Notifications, Filters, Pagination

## Prerequisites
- Run migrations: `005_domain_claimtype_notifications.sql` and `006_integrity_refinement.sql` in Supabase SQL Editor.
- App running locally (e.g. `npm run dev`).

---

## 1. Mark creation (domain + claim type)
- [ ] Go to **Create** (logged in).
- [ ] Fill content (no category dropdown).
- [ ] **Domain** dropdown shows: Music, Dance, Literature, VisualArt, Architecture, Politics, Business, Technology, Science, Sport, Law, Culture, General.
- [ ] **Claim Type** dropdown shows: Creation, Prediction, Implementation, Discovery, Innovation, Strategy, Record.
- [ ] Submit with Domain + Claim Type selected → mark is created and redirects to mark detail.
- [ ] Mark detail and feed card show **domain** and **claim type** badges.

---

## 2. Feed filtering
- [ ] **Feed** has filters: **Domain** (All + list), **Claim Type** (All + list), **Disputed only** checkbox.
- [ ] Changing Domain filters marks by domain.
- [ ] Changing Claim Type filters marks by claim type.
- [ ] Checking **Disputed only** shows only marks with dispute_count > 0.
- [ ] Combining filters works (e.g. Domain=Technology + Disputed only).

---

## 3. Feed pagination
- [ ] Feed shows up to 20 marks initially.
- [ ] If there are more than 20, **Load more** appears.
- [ ] Click **Load more** → next 20 append below; **Load more** updates or disappears when no more.
- [ ] Changing filters resets the list (first page only).

---

## 4. Profile filtering + pagination
- [ ] Open a **Profile** with multiple marks.
- [ ] Same filter controls: Domain, Claim Type, Disputed only.
- [ ] Filters apply to that user’s marks only.
- [ ] **Load more** works for profile marks (cursor pagination).

---

## 5. Dispute notification
- [ ] User A creates a mark. User B (or another account) creates an **evidence-backed** challenge (with evidence URL) on that mark.
- [ ] User A sees a new notification: type **DISPUTE_CREATED**, message like “@B disputed your mark”.
- [ ] **Notifications** page (or dropdown) shows it; unread count in header bell increases.
- [ ] Clicking the notification goes to the mark and marks it read.

---

## 6. Resolution notifications (SUPPLANTED / CHAMPION)
- [ ] **MARK_SUPPLANTED**: When a mark’s status becomes SUPPLANTED (via vote outcome / compute_mark_status), mark owner gets a notification “Your mark was supplanted.”
- [ ] **MARK_CHAMPION**: When a disputed mark becomes CHAMPION, mark owner gets “Your mark became champion.”
- [ ] Both appear in notifications; clicking goes to the mark.

---

## 7. Withdraw notification
- [ ] User A has a mark with **no challenges**. User A **withdraws** the mark.
- [ ] User A gets notification **MARK_WITHDRAWN** (“Your mark was withdrawn.”).
- [ ] It appears in the notifications list and can be marked read.

---

## 8. Notifications API + UI
- [ ] **GET /api/notifications** (authenticated): returns `notifications`, `nextCursor`, `unreadCount`. `?cursor=&limit=20` works for pagination.
- [ ] **PATCH /api/notifications/[id]/read**: marks one notification read (only own); returns updated row.
- [ ] **PATCH /api/notifications/read-all**: marks all own unread as read.
- [ ] **Header**: Bell icon shows unread count; link to **/notifications**.
- [ ] **/notifications** page: list, “Mark all read”, “Load more”, click notification → go to mark + mark as read.

---

## 9. Indexes and RLS
- [ ] Feed and profile lists load without timeouts with many marks.
- [ ] Notifications: user can only see and update (read_at) their own; no insert as anon (only via RPC / service role).

---

## 10. No regressions
- [ ] Existing disputes, votes, comments still work.
- [ ] Mark detail challenges/comments tabs and voting unchanged.
- [ ] Withdraw/contest flow still works.

---

## 11. Integrity refinement (006)

### Edit before/after challenge
- [ ] Create mark (no challenges). **Edit** button visible. Edit content → saves. Version created.
- [ ] Create evidence-backed challenge on that mark. **Edit** button disappears. Edit blocked (API returns "Mark is locked").
- [ ] Mark with versions shows **Edited (X)**. Click → History tab shows version list.

### Concede
- [ ] Owner of disputed mark clicks **Concede** → all PENDING challenges → outcome CONCEDED, mark status SUPPLANTED.
- [ ] Profile stats: **Disputes conceded** increments for owner; **Disputes won** increments for challengers.

### Withdraw pre-challenge only
- [ ] Mark with **no challenges**: **Withdraw** button visible. Withdraw works.
- [ ] Mark with **challenges**: **Withdraw** button hidden. Only **Concede** and **Contest** shown.

### Supported tab
- [ ] Profile has tabs: **Marks**, **Challenges**, **Comments**, **Supported**.
- [ ] **Supported** tab shows marks the user has voted Support on. Paginated.
- [ ] Support is removable: vote Support → **Remove** appears → remove → vote gone.

### Duplicate title
- [ ] MarkCard shows: avatar + @username, content once, domain/claim_type badges. No duplicated title.
- [ ] Mark detail: content once, no duplicate headline.
