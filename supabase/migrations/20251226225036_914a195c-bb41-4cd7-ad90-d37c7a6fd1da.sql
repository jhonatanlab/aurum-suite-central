-- Add category and status columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add check constraint for status values
ALTER TABLE public.products 
ADD CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive'));