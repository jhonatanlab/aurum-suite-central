
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  supplies TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select suppliers" ON public.suppliers FOR SELECT USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Update suppliers" ON public.suppliers FOR UPDATE USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Delete suppliers" ON public.suppliers FOR DELETE USING (user_belongs_to_company(company_id));

-- Add trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add supplier_id to product_batches
ALTER TABLE public.product_batches ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
