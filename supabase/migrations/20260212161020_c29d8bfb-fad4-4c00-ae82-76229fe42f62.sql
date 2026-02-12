
-- Table: stripe_customers
CREATE TABLE public.stripe_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select stripe_customers" ON public.stripe_customers FOR SELECT USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Insert stripe_customers" ON public.stripe_customers FOR INSERT WITH CHECK (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Update stripe_customers" ON public.stripe_customers FOR UPDATE USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Delete stripe_customers" ON public.stripe_customers FOR DELETE USING (user_belongs_to_company(company_id));

CREATE INDEX idx_stripe_customers_company ON public.stripe_customers(company_id);
CREATE INDEX idx_stripe_customers_stripe_id ON public.stripe_customers(stripe_customer_id);

-- Table: subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select subscriptions" ON public.subscriptions FOR SELECT USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Update subscriptions" ON public.subscriptions FOR UPDATE USING (user_belongs_to_company(company_id));
CREATE POLICY "Tenant Delete subscriptions" ON public.subscriptions FOR DELETE USING (user_belongs_to_company(company_id));

CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
