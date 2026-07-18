
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS plating text,
  ADD COLUMN IF NOT EXISTS stone text,
  ADD COLUMN IF NOT EXISTS supplier_reference text,
  ADD COLUMN IF NOT EXISTS ncm text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb;

CREATE INDEX IF NOT EXISTS idx_products_parent_id
  ON public.products(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_type_check
  CHECK (type IN ('simple', 'bundle', 'variable', 'variation'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_variant_structure_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_variant_structure_check
  CHECK (
    (type = 'variation' AND parent_id IS NOT NULL) OR
    (type = 'variable'  AND parent_id IS NULL) OR
    (type IN ('simple', 'bundle') AND parent_id IS NULL)
  );

CREATE OR REPLACE FUNCTION public.validate_bundle_item_is_simple()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE id = NEW.product_id
      AND type NOT IN ('simple', 'variation')
  ) THEN
    RAISE EXCEPTION 'Um kit não pode conter outro kit nem um produto agrupador. Apenas produtos simples ou variações são permitidos.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW public.product_effective_cover AS
SELECT
  p.id AS product_id,
  p.company_id,
  COALESCE(own_cover.file_path, parent_cover.file_path) AS file_path
FROM public.products p
LEFT JOIN public.product_images own_cover
  ON own_cover.product_id = p.id AND own_cover.is_primary = true
LEFT JOIN public.product_images parent_cover
  ON p.parent_id IS NOT NULL
  AND parent_cover.product_id = p.parent_id
  AND parent_cover.is_primary = true;

GRANT SELECT ON public.product_effective_cover TO authenticated;
