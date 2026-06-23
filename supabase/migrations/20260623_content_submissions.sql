-- Content submissions: members submit content (files/links) for brand review
-- Brand owner/members can view; members can insert; owner can update status/feedback

CREATE TABLE IF NOT EXISTS public.content_submissions (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id       uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  deal_id        uuid        REFERENCES public.deals(id) ON DELETE SET NULL,
  submitted_by   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url       text,
  file_name      text,
  content_type   text        NOT NULL DEFAULT 'link',   -- 'image' | 'video' | 'document' | 'link'
  caption        text,
  notes          text,
  status         text        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'needs_revision' | 'rejected'
  feedback       text,
  submitted_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cs_brand_idx ON public.content_submissions(brand_id);
CREATE INDEX IF NOT EXISTS cs_by_idx    ON public.content_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS cs_deal_idx  ON public.content_submissions(deal_id);

ALTER TABLE public.content_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: brand owner + any brand member
CREATE POLICY "Brand members can view content submissions"
  ON public.content_submissions FOR SELECT
  USING (
    brand_id IN (
      SELECT id       FROM public.brands        WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id  = auth.uid()
    )
  );

-- INSERT: any brand member (must be their own submission)
CREATE POLICY "Brand members can submit content"
  ON public.content_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND brand_id IN (
      SELECT id       FROM public.brands        WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id  = auth.uid()
    )
  );

-- UPDATE: brand owner only (for status + feedback)
CREATE POLICY "Brand owner can review content"
  ON public.content_submissions FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
    )
  );

-- DELETE: brand owner only
CREATE POLICY "Brand owner can delete content"
  ON public.content_submissions FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
    )
  );

-- ─── Storage bucket for uploaded content files ────────────────────────────────
-- Run this separately in the Supabase Dashboard → Storage if the bucket doesn't exist:
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('content', 'content', true)
--   ON CONFLICT (id) DO NOTHING;
--
-- Storage RLS policies (also set in Dashboard → Storage → content bucket → Policies):
--
--   Policy name: "Brand members can upload"
--   Operation:   INSERT
--   Expression:  bucket_id = 'content' AND auth.role() = 'authenticated'
--
--   Policy name: "Public read"
--   Operation:   SELECT
--   Expression:  bucket_id = 'content'
