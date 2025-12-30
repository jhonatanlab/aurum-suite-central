-- Create tags table for multi-company tag management
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  company_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY "Tenant Select tags"
ON public.tags
FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert tags"
ON public.tags
FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update tags"
ON public.tags
FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete tags"
ON public.tags
FOR DELETE
USING (user_belongs_to_company(company_id));

-- Create trigger for updated_at
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_tags_company_id ON public.tags(company_id);
CREATE INDEX idx_tags_active ON public.tags(active);