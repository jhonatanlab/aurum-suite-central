
-- Create bundle_items table
CREATE TABLE public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Index for performance
CREATE INDEX idx_bundle_items_bundle_id ON public.bundle_items(bundle_id);

-- Enable RLS
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (access via product's company)
CREATE POLICY "Tenant Select bundle_items" ON public.bundle_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = bundle_items.bundle_id AND user_belongs_to_company(p.company_id)
  ));

CREATE POLICY "Tenant Insert bundle_items" ON public.bundle_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = bundle_items.bundle_id AND user_belongs_to_company(p.company_id)
  ));

CREATE POLICY "Tenant Update bundle_items" ON public.bundle_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = bundle_items.bundle_id AND user_belongs_to_company(p.company_id)
  ));

CREATE POLICY "Tenant Delete bundle_items" ON public.bundle_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = bundle_items.bundle_id AND user_belongs_to_company(p.company_id)
  ));

-- Trigger function to prevent bundles containing other bundles
CREATE OR REPLACE FUNCTION public.validate_bundle_item_is_simple()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND type != 'simple') THEN
    RAISE EXCEPTION 'Um kit não pode conter outro kit. Apenas produtos simples são permitidos.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_bundle_item_is_simple
  BEFORE INSERT OR UPDATE ON public.bundle_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bundle_item_is_simple();
