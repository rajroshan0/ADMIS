-- Drop existing brand_tasks table and recreate with full schema
DROP TABLE IF EXISTS public.brand_tasks CASCADE;

CREATE TABLE public.brand_tasks (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id     uuid        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  assigned_to  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  description  text,
  department   text,                                        -- 'marketing' | 'sales' | 'content' | etc.
  status       text        NOT NULL DEFAULT 'todo',         -- 'todo' | 'in_progress' | 'done'
  priority     text        NOT NULL DEFAULT 'medium',       -- 'low' | 'medium' | 'high'
  due_date     date,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX brand_tasks_brand_id_idx ON public.brand_tasks(brand_id);
CREATE INDEX brand_tasks_assigned_idx ON public.brand_tasks(assigned_to);
CREATE INDEX brand_tasks_status_idx   ON public.brand_tasks(brand_id, status);

ALTER TABLE public.brand_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand members read tasks"
  ON public.brand_tasks FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members insert tasks"
  ON public.brand_tasks FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brand members update tasks"
  ON public.brand_tasks FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
      UNION
      SELECT brand_id FROM public.brand_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brand owner deletes tasks"
  ON public.brand_tasks FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE owner_id = auth.uid()
    )
  );
