-- Criar tabela de garantias
CREATE TABLE public.warranty_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name TEXT,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'exchange', -- exchange, herd, repair, total_loss
  batch_code TEXT,
  batch_date DATE,
  status TEXT NOT NULL DEFAULT 'analyzing', -- analyzing, approved, completed, denied
  reason TEXT,
  resolution TEXT,
  resolution_date TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warranty_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select warranty_requests" 
ON public.warranty_requests 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert warranty_requests" 
ON public.warranty_requests 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update warranty_requests" 
ON public.warranty_requests 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete warranty_requests" 
ON public.warranty_requests 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_warranty_requests_updated_at
BEFORE UPDATE ON public.warranty_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();