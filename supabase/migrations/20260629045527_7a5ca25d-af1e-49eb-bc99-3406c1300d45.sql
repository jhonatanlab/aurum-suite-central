ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS warranty_id UUID REFERENCES public.warranty_requests(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.product_batches.source_type IS 'Origem do movimento: sale, warranty_origin, warranty_replacement, manual, replenishment, adjustment';
COMMENT ON COLUMN public.product_batches.source_id IS 'ID da entidade de origem (sale_id ou warranty_id conforme source_type)';
COMMENT ON COLUMN public.product_batches.warranty_id IS 'FK direta para a garantia que originou este movimento, quando aplicável';

CREATE INDEX IF NOT EXISTS idx_product_batches_warranty_id ON public.product_batches(warranty_id) WHERE warranty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_batches_source ON public.product_batches(source_type, source_id) WHERE source_id IS NOT NULL;