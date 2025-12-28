-- Add origin column to financial_transactions for tracking source
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS origin text DEFAULT 'manual';

-- Create recurring_transactions table
CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('entrada', 'saida')),
  category_id uuid REFERENCES public.financial_categories(id),
  payment_method_default text,
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('monthly', 'weekly', 'yearly', 'custom')),
  custom_interval_days int,
  start_date date NOT NULL,
  is_limited boolean NOT NULL DEFAULT false,
  installments_total int,
  installments_remaining int,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_execution date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing user_belongs_to_company function
CREATE POLICY "Tenant Select recurring_transactions"
ON public.recurring_transactions
FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert recurring_transactions"
ON public.recurring_transactions
FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update recurring_transactions"
ON public.recurring_transactions
FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete recurring_transactions"
ON public.recurring_transactions
FOR DELETE
USING (user_belongs_to_company(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();