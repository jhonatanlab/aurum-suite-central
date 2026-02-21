
-- Function: get_bundle_price
CREATE OR REPLACE FUNCTION public.get_bundle_price(bundle_uuid UUID)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.pricing_mode = 'manual' THEN p.manual_price
      ELSE (
        SELECT COALESCE(SUM(comp.price * bi.quantity), 0)
        FROM bundle_items bi
        JOIN products comp ON comp.id = bi.product_id
        WHERE bi.bundle_id = bundle_uuid
      )
    END
  FROM products p
  WHERE p.id = bundle_uuid;
$$;

-- Function: get_bundle_max_stock
CREATE OR REPLACE FUNCTION public.get_bundle_max_stock(bundle_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    MIN(FLOOR(COALESCE(comp.stock, 0)::numeric / bi.quantity)::integer),
    0
  )
  FROM bundle_items bi
  JOIN products comp ON comp.id = bi.product_id
  WHERE bi.bundle_id = bundle_uuid;
$$;

-- Function: sell_bundle (handles stock reduction in a single transaction)
CREATE OR REPLACE FUNCTION public.sell_bundle(bundle_uuid UUID, qty INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_stock INTEGER;
BEGIN
  -- Validate stock
  max_stock := get_bundle_max_stock(bundle_uuid);
  IF qty > max_stock THEN
    RAISE EXCEPTION 'Estoque insuficiente para o kit. Máximo disponível: %', max_stock;
  END IF;

  -- Reduce stock for each component
  UPDATE products
  SET stock = stock - (bi.quantity * qty)
  FROM bundle_items bi
  WHERE bi.bundle_id = bundle_uuid
    AND products.id = bi.product_id;
END;
$$;

-- Prevent duplicate product_id in same bundle
ALTER TABLE public.bundle_items
  ADD CONSTRAINT bundle_items_unique_product UNIQUE (bundle_id, product_id);

-- Prevent empty bundles: trigger on product delete from bundle
-- (validation at app level is also needed, but this adds DB-level safety)
