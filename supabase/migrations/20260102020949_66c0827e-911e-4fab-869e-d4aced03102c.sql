-- Add seller_id and status columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';

-- Add index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);