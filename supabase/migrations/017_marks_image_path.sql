-- Migration: store uploaded media path alongside URL
ALTER TABLE public.marks
ADD COLUMN IF NOT EXISTS image_path text;
