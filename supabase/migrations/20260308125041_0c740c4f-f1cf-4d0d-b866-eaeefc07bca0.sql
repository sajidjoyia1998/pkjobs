ALTER TABLE public.education_fields ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on current display_name order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY education_level ORDER BY display_name) as rn
  FROM public.education_fields
)
UPDATE public.education_fields ef
SET sort_order = r.rn
FROM ranked r
WHERE ef.id = r.id;