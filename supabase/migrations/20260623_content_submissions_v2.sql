-- Add price + channel_name to content_submissions
-- (table already exists; notes/caption may or may not exist — we stop using them)

ALTER TABLE public.content_submissions
  ADD COLUMN IF NOT EXISTS price        numeric,
  ADD COLUMN IF NOT EXISTS channel_name text;
