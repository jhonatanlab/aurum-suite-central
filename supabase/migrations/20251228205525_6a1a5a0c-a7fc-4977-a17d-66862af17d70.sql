-- Add tags column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create crm_history table for tracking lead changes
CREATE TABLE public.crm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Create index for faster queries
CREATE INDEX idx_crm_history_lead_id ON public.crm_history(lead_id);
CREATE INDEX idx_crm_history_created_at ON public.crm_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.crm_history ENABLE ROW LEVEL SECURITY;

-- RLS policies using lead's company relationship
CREATE POLICY "Tenant Select crm_history" ON public.crm_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id AND user_belongs_to_company(l.company_id)
    )
  );

CREATE POLICY "Tenant Insert crm_history" ON public.crm_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id AND user_belongs_to_company(l.company_id)
    )
  );

CREATE POLICY "Tenant Delete crm_history" ON public.crm_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id AND user_belongs_to_company(l.company_id)
    )
  );