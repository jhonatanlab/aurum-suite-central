
DROP POLICY IF EXISTS "Users can upload product images for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view product images from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images from their company" ON storage.objects;

CREATE POLICY "Product images select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND public.user_belongs_to_company(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Product images insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.user_belongs_to_company(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Product images update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.user_belongs_to_company(((storage.foldername(name))[1])::uuid));

CREATE POLICY "Product images delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.user_belongs_to_company(((storage.foldername(name))[1])::uuid));
