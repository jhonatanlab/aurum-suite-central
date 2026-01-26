-- Create storage bucket for campaign media
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their company folder
CREATE POLICY "Users can upload campaign media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-media');

-- Allow public read access to campaign media
CREATE POLICY "Campaign media is publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'campaign-media');

-- Allow users to delete their own campaign media
CREATE POLICY "Users can delete campaign media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-media');