
-- Add batch_type and adjustment_reason columns to product_batches
ALTER TABLE public.product_batches 
ADD COLUMN batch_type text NOT NULL DEFAULT 'replenishment',
ADD COLUMN adjustment_reason text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.product_batches.batch_type IS 'Type: replenishment (new stock entry) or adjustment (manual correction)';
COMMENT ON COLUMN public.product_batches.adjustment_reason IS 'Reason for stock adjustment: loss, breakage, inventory, correction';
