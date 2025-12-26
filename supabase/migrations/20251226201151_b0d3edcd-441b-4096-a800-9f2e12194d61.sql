-- Adicionar campos à tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS owner_uid uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para updated_at na tabela companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar a função handle_new_user para incluir owner_uid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_uid)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'), NEW.id)
  RETURNING id INTO new_company_id;
  
  -- Link user to the company as owner
  INSERT INTO public.company_users (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Função para criar empresa manualmente (quando usuário já existe mas não tem empresa)
CREATE OR REPLACE FUNCTION public.create_company_for_user(
  _name text,
  _cnpj text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  existing_company_id UUID;
BEGIN
  -- Verificar se usuário já tem empresa
  SELECT company_id INTO existing_company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF existing_company_id IS NOT NULL THEN
    RAISE EXCEPTION 'Usuário já possui uma empresa vinculada';
  END IF;
  
  -- Criar empresa
  INSERT INTO public.companies (name, cnpj, owner_uid)
  VALUES (_name, _cnpj, auth.uid())
  RETURNING id INTO new_company_id;
  
  -- Vincular usuário como owner
  INSERT INTO public.company_users (user_id, company_id, role)
  VALUES (auth.uid(), new_company_id, 'owner');
  
  RETURN new_company_id;
END;
$$;

-- Permitir INSERT na tabela companies para usuários autenticados (via função)
CREATE POLICY "Users can create companies" ON public.companies
  FOR INSERT WITH CHECK (owner_uid = auth.uid());