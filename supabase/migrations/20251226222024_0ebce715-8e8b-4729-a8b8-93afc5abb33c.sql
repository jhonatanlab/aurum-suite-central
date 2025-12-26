-- Add notes column to leads table for storing annotations
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.notes IS 'Free-form notes/annotations about the lead';