
-- Create product_batches table for lot tracking
CREATE TABLE public.product_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  observation TEXT
);

-- Add minimum_stock column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS minimum_stock INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select product_batches" 
ON public.product_batches 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert product_batches" 
ON public.product_batches 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update product_batches" 
ON public.product_batches 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete product_batches" 
ON public.product_batches 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- Create index for faster queries
CREATE INDEX idx_product_batches_product_id ON public.product_batches(product_id);
CREATE INDEX idx_product_batches_company_id ON public.product_batches(company_id);
CREATE INDEX idx_product_batches_batch_code ON public.product_batches(batch_code);
