
-- Create financial_categories table
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ambos')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  value NUMERIC NOT NULL,
  method TEXT,
  status TEXT NOT NULL CHECK (status IN ('pago', 'pendente', 'atrasado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_categories
CREATE POLICY "Tenant Select financial_categories" 
ON public.financial_categories 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert financial_categories" 
ON public.financial_categories 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update financial_categories" 
ON public.financial_categories 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete financial_categories" 
ON public.financial_categories 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- RLS policies for financial_transactions
CREATE POLICY "Tenant Select financial_transactions" 
ON public.financial_transactions 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert financial_transactions" 
ON public.financial_transactions 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update financial_transactions" 
ON public.financial_transactions 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete financial_transactions" 
ON public.financial_transactions 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- Create indexes
CREATE INDEX idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(date);
CREATE INDEX idx_financial_transactions_category ON public.financial_transactions(category_id);
CREATE INDEX idx_financial_categories_company ON public.financial_categories(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
