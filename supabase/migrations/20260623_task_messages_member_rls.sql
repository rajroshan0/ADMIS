-- Allow brand members to read and write task_messages
-- (table was created in a previous migration without member policies)

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Brand members can read task messages"  ON public.task_messages;
DROP POLICY IF EXISTS "Brand members can insert task messages" ON public.task_messages;
DROP POLICY IF EXISTS "Brand owner reads task messages"       ON public.task_messages;
DROP POLICY IF EXISTS "Brand owner inserts task messages"     ON public.task_messages;

-- Enable RLS just in case it wasn't enabled
ALTER TABLE public.task_messages ENABLE ROW LEVEL SECURITY;

-- READ: brand owners and all brand members
CREATE POLICY "Brand members can read task messages"
  ON public.task_messages FOR SELECT
  USING (
    brand_id IN (
      SELECT id       FROM public.brands        WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id  = auth.uid()
    )
  );

-- INSERT: brand owners and brand members (sender must be themselves)
CREATE POLICY "Brand members can insert task messages"
  ON public.task_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND brand_id IN (
      SELECT id       FROM public.brands        WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id  = auth.uid()
    )
  );
