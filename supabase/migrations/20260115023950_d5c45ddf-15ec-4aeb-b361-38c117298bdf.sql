-- Criar tabela de fechamentos de consignação
CREATE TABLE public.consignment_closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  closed_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_by text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_items integer NOT NULL DEFAULT 0,
  total_sold integer NOT NULL DEFAULT 0,
  total_returned integer NOT NULL DEFAULT 0,
  total_pending integer NOT NULL DEFAULT 0,
  total_sold_value numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'percent',
  commission_value numeric NOT NULL DEFAULT 0,
  observation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.consignment_closings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Tenant Select consignment_closings"
  ON public.consignment_closings FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert consignment_closings"
  ON public.consignment_closings FOR INSERT
  WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete consignment_closings"
  ON public.consignment_closings FOR DELETE
  USING (user_belongs_to_company(company_id));

-- Adicionar colunas faltantes na tabela consignment_items
ALTER TABLE public.consignment_items 
ADD COLUMN IF NOT EXISTS sale_value numeric,
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_id uuid REFERENCES public.consignment_closings(id),
ADD COLUMN IF NOT EXISTS returned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS returned_by text;