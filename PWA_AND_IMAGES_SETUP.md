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
   - Create `mark-images` (public) – for mark images

2. **Run the migration** to add `image_url` to marks and storage policies.

### Bucket Policies

The migration adds RLS policies for:
- **avatars**: Authenticated users can upload; public read
- **mark-images**: Authenticated users upload to `{user_id}/` folder; public read; owners can delete

## Image Marks

- Create flow: Add optional image via "Add image"; uploads to `mark-images` before creating mark
- At least one of text or image required
- Domain and Claim Type remain required

## Profile Redesign

- New `ProfileHeader` with gradient banner, large avatar with ring
- `ProfileStats` as compact pills
- Tabs (Marks, Challenges, Comments, Supported) always clickable with friendly empty states
