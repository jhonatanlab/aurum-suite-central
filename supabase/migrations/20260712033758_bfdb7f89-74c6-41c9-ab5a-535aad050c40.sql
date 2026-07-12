-- 1. Colunas SKU e código de barras em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text;

CREATE UNIQUE INDEX IF NOT EXISTS products_company_sku_unique
  ON public.products (company_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE UNIQUE INDEX IF NOT EXISTS products_company_barcode_unique
  ON public.products (company_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode) WHERE barcode IS NOT NULL;

-- 2. Tabela product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_company_id ON public.product_images(company_id);

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product
  ON public.product_images (product_id) WHERE is_primary = true;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select product_images" ON public.product_images
  FOR SELECT USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert product_images" ON public.product_images
  FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update product_images" ON public.product_images
  FOR UPDATE USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete product_images" ON public.product_images
  FOR DELETE USING (public.user_belongs_to_company(company_id));

-- 3. Storage policies (bucket product-images criado via tool)
CREATE POLICY "Users can view product images from their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY "Users can upload product images for their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY "Users can update product images from their company"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY "Users can delete product images from their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);