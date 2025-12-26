
-- COMPANIES POLICIES
CREATE POLICY "Select company data" ON public.companies
  FOR SELECT USING (public.user_belongs_to_company(id));

CREATE POLICY "Manage company data" ON public.companies
  FOR UPDATE USING (public.get_user_role(id) IN ('owner', 'admin'));

-- COMPANY_USERS POLICIES
CREATE POLICY "Select own membership" ON public.company_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Insert self on signup" ON public.company_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- LEADS POLICIES
CREATE POLICY "Tenant Select leads" ON public.leads
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert leads" ON public.leads
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update leads" ON public.leads
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete leads" ON public.leads
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- PRODUCTS POLICIES
CREATE POLICY "Tenant Select products" ON public.products
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert products" ON public.products
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update products" ON public.products
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete products" ON public.products
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- SALES POLICIES
CREATE POLICY "Tenant Select sales" ON public.sales
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert sales" ON public.sales
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update sales" ON public.sales
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete sales" ON public.sales
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- SALE_ITEMS POLICIES (via sales relationship)
CREATE OR REPLACE FUNCTION public.sale_belongs_to_user_company(_sale_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.sales s
    WHERE s.id = _sale_id 
      AND public.user_belongs_to_company(s.company_id)
  )
$$;

CREATE POLICY "Tenant Select sale_items" ON public.sale_items
  FOR SELECT USING (public.sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Insert sale_items" ON public.sale_items
  FOR INSERT WITH CHECK (public.sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Update sale_items" ON public.sale_items
  FOR UPDATE USING (public.sale_belongs_to_user_company(sale_id));

CREATE POLICY "Tenant Delete sale_items" ON public.sale_items
  FOR DELETE USING (public.sale_belongs_to_user_company(sale_id));

-- CAMPAIGNS POLICIES
CREATE POLICY "Tenant Select campaigns" ON public.campaigns
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update campaigns" ON public.campaigns
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete campaigns" ON public.campaigns
  FOR DELETE USING (public.user_belongs_to_company(company_id));
