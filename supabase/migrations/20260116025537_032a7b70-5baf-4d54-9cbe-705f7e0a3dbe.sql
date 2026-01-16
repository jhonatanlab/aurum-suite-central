-- Create reseller_payments table
CREATE TABLE public.reseller_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  reseller_id UUID NOT NULL,
  closing_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  observation TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reseller_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select reseller_payments"
ON public.reseller_payments
FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert reseller_payments"
ON public.reseller_payments
FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update reseller_payments"
ON public.reseller_payments
FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete reseller_payments"
ON public.reseller_payments
FOR DELETE
USING (user_belongs_to_company(company_id));