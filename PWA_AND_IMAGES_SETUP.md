# Omarko PWA + Image Marks Setup

## Database & Storage

Run the SQL in Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- File: supabase/migrations/omarko_image_marks.sql
-- Or copy the contents of that file
```

### Manual Steps (Dashboard)

1. **Create Storage Buckets**
   - Go to Storage → New bucket
   - Create `avatars` (public) – for profile avatars
   - Create `mark-media` (public) – for mark attachments (images/audio/video)

2. **Run the migrations** to add `image_url` to marks and storage policies (027, 032).

### Bucket Policies

The app uses a single bucket **mark-media** for all mark attachments. Run `032_mark_media_storage_policies_public_read.sql` for:
- **mark-media**: Public read; authenticated upload to `{user_id}/` or `{user_id}/{mark_id}/`; owner update/delete
- **avatars**: Authenticated users can upload; public read (see 011 / omarko_image_marks)

## Image Marks

- Create flow: Add optional image via "Add image"; uploads to **mark-media** before creating mark
- At least one of text or image required
- Domain and Claim Type remain required

## Profile Redesign

- New `ProfileHeader` with gradient banner, large avatar with ring
- `ProfileStats` as compact pills
- Tabs (Marks, Challenges, Comments, Supported) always clickable with friendly empty states
