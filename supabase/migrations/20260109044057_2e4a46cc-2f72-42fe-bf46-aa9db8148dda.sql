-- Tabela de revendedores
CREATE TABLE public.resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),
  commission_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de revendedores
CREATE TABLE public.reseller_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_resellers_company_id ON public.resellers(company_id);
CREATE INDEX idx_resellers_status ON public.resellers(status);
CREATE INDEX idx_reseller_history_reseller_id ON public.reseller_history(reseller_id);

-- Trigger para updated_at
CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para resellers
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select resellers"
  ON public.resellers FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert resellers"
  ON public.resellers FOR INSERT
  WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update resellers"
  ON public.resellers FOR UPDATE
  USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete resellers"
  ON public.resellers FOR DELETE
  USING (user_belongs_to_company(company_id));

-- RLS para reseller_history
ALTER TABLE public.reseller_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select reseller_history"
  ON public.reseller_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = reseller_history.reseller_id
    AND user_belongs_to_company(r.company_id)
  ));

CREATE POLICY "Tenant Insert reseller_history"
  ON public.reseller_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = reseller_history.reseller_id
    AND user_belongs_to_company(r.company_id)
  ));

CREATE POLICY "Tenant Delete reseller_history"
  ON public.reseller_history FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = reseller_history.reseller_id
    AND user_belongs_to_company(r.company_id)
  ));