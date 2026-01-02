-- Add cancellation fields to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create index for cancelled_by
CREATE INDEX IF NOT EXISTS idx_sales_cancelled_by ON public.sales(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_sales_cancelled_at ON public.sales(cancelled_at);