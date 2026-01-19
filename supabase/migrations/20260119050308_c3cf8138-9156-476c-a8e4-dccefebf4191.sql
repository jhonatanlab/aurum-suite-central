-- Create storage bucket for reseller documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('reseller-documents', 'reseller-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can view reseller documents from their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reseller-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.resellers 
    WHERE company_id = public.get_user_company_id()
  )
);

CREATE POLICY "Users can upload reseller documents for their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reseller-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.resellers 
    WHERE company_id = public.get_user_company_id()
  )
);

CREATE POLICY "Users can delete reseller documents from their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reseller-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.resellers 
    WHERE company_id = public.get_user_company_id()
  )
);

-- Create table to track reseller documents metadata
CREATE TABLE public.reseller_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reseller_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view reseller documents from their company"
ON public.reseller_documents FOR SELECT
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert reseller documents for their company"
ON public.reseller_documents FOR INSERT
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete reseller documents from their company"
ON public.reseller_documents FOR DELETE
USING (public.user_belongs_to_company(company_id));

-- Create index
CREATE INDEX idx_reseller_documents_reseller_id ON public.reseller_documents(reseller_id);