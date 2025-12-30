-- Add history column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;