-- Create payment_gateways table for card machines and payment gateways
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'card_machine', -- 'card_machine', 'online_gateway', 'bank'
  service_fee_percent NUMERIC NOT NULL DEFAULT 0, -- Taxa de serviço do gateway (%)
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_gateways
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_gateways
CREATE POLICY "Tenant Select payment_gateways" ON public.payment_gateways
  FOR SELECT USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert payment_gateways" ON public.payment_gateways
  FOR INSERT WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update payment_gateways" ON public.payment_gateways
  FOR UPDATE USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete payment_gateways" ON public.payment_gateways
  FOR DELETE USING (user_belongs_to_company(company_id));

-- Create sale_payments table for multiple payments per sale
CREATE TABLE public.sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL, -- 'pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'
  amount NUMERIC NOT NULL,
  installments INTEGER DEFAULT 1,
  gateway_id UUID REFERENCES public.payment_gateways(id),
  interest_rate_percent NUMERIC DEFAULT 0, -- Taxa de juros aplicada (%)
  interest_amount NUMERIC DEFAULT 0, -- Valor dos juros
  gateway_fee_percent NUMERIC DEFAULT 0, -- Taxa do gateway aplicada (%)
  gateway_fee_amount NUMERIC DEFAULT 0, -- Valor da taxa do gateway
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sale_payments
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for sale_payments (via sale_belongs_to_user_company)
CREATE POLICY "Tenant Select sale_payments" ON public.sale_payments
  FOR SELECT USING (sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Insert sale_payments" ON public.sale_payments
  FOR INSERT WITH CHECK (sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Update sale_payments" ON public.sale_payments
  FOR UPDATE USING (sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Delete sale_payments" ON public.sale_payments
  FOR DELETE USING (sale_belongs_to_user_company(sale_id));

-- Add new columns to sales table for enhanced PDV
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_freight NUMERIC DEFAULT 0, -- Frete pago pelo cliente (soma ao total)
ADD COLUMN IF NOT EXISTS store_freight NUMERIC DEFAULT 0, -- Frete pago pela loja (custo)
ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0, -- Total efetivamente recebido
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0, -- Saldo pendente
ADD COLUMN IF NOT EXISTS sale_costs JSONB DEFAULT '[]'::jsonb; -- Custos da venda (juros, fretes, taxas)

-- Add payment settings to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
  "max_installments": 12,
  "interest_rate_percent": 0,
  "interest_starts_at": 1,
  "pass_interest_to_customer": true,
  "installment_rules": []
}'::jsonb;

-- Create trigger for payment_gateways updated_at
CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();