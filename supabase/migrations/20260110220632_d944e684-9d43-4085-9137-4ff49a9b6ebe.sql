-- Create consignment_items table to track products consigned to resellers
CREATE TABLE public.consignment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  consignment_value NUMERIC NOT NULL,
  sent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  observation TEXT,
  status TEXT NOT NULL DEFAULT 'with_reseller',
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consignment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select consignment_items" 
ON public.consignment_items 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert consignment_items" 
ON public.consignment_items 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update consignment_items" 
ON public.consignment_items 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete consignment_items" 
ON public.consignment_items 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- Create updated_at trigger
CREATE TRIGGER update_consignment_items_updated_at
BEFORE UPDATE ON public.consignment_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_consignment_items_reseller ON public.consignment_items(reseller_id);
CREATE INDEX idx_consignment_items_status ON public.consignment_items(status);