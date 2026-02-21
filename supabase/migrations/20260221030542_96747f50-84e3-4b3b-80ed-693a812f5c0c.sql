
-- Add new columns to products table
ALTER TABLE public.products
  ADD COLUMN type text NOT NULL DEFAULT 'simple',
  ADD COLUMN pricing_mode text,
  ADD COLUMN manual_price numeric(10,2);

-- Add check constraints
ALTER TABLE public.products
  ADD CONSTRAINT products_type_check CHECK (type IN ('simple', 'bundle')),
  ADD CONSTRAINT products_pricing_mode_check CHECK (pricing_mode IS NULL OR pricing_mode IN ('auto_sum', 'manual'));
