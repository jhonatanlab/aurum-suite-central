
-- Create trigger function to sync products.stock with product_batches sum
CREATE OR REPLACE FUNCTION public.sync_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_product_id uuid;
  new_stock integer;
BEGIN
  -- Determine which product_id to update
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  -- Calculate total stock from active batches
  SELECT COALESCE(SUM(quantity), 0) INTO new_stock
  FROM public.product_batches
  WHERE product_id = target_product_id AND status = 'active';

  -- Update the products table
  UPDATE public.products SET stock = new_stock WHERE id = target_product_id;

  -- Also handle OLD product_id if it changed
  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    SELECT COALESCE(SUM(quantity), 0) INTO new_stock
    FROM public.product_batches
    WHERE product_id = OLD.product_id AND status = 'active';
    
    UPDATE public.products SET stock = new_stock WHERE id = OLD.product_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on product_batches for INSERT, UPDATE, DELETE
CREATE TRIGGER sync_stock_after_batch_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock();

-- Sync all existing products now
UPDATE public.products p
SET stock = COALESCE(
  (SELECT SUM(pb.quantity) FROM public.product_batches pb WHERE pb.product_id = p.id AND pb.status = 'active'),
  0
)
WHERE p.type = 'simple';
