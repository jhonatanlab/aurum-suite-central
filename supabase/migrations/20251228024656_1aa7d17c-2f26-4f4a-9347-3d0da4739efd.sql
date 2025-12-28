-- Create crm_stages table for dynamic Kanban columns
CREATE TABLE public.crm_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant Select crm_stages"
ON public.crm_stages
FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert crm_stages"
ON public.crm_stages
FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update crm_stages"
ON public.crm_stages
FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete crm_stages"
ON public.crm_stages
FOR DELETE
USING (user_belongs_to_company(company_id));

-- Index for performance
CREATE INDEX idx_crm_stages_company_position ON public.crm_stages(company_id, position);