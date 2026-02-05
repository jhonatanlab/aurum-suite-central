-- Add media support columns to whatsapp_messages
-- Safe migration: only adding new columns, no changes to existing fields

ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_mime_type text,
ADD COLUMN IF NOT EXISTS media_size integer,
ADD COLUMN IF NOT EXISTS media_duration integer,
ADD COLUMN IF NOT EXISTS media_thumbnail text,
ADD COLUMN IF NOT EXISTS file_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.whatsapp_messages.message_type IS 'Type of message: text, image, audio, video, document, sticker, etc.';
COMMENT ON COLUMN public.whatsapp_messages.media_mime_type IS 'MIME type of the media file (e.g., image/jpeg, audio/ogg)';
COMMENT ON COLUMN public.whatsapp_messages.media_size IS 'Size of the media file in bytes';
COMMENT ON COLUMN public.whatsapp_messages.media_duration IS 'Duration of audio/video in seconds';
COMMENT ON COLUMN public.whatsapp_messages.media_thumbnail IS 'Base64 or URL of media thumbnail';
COMMENT ON COLUMN public.whatsapp_messages.file_name IS 'Original file name for documents';