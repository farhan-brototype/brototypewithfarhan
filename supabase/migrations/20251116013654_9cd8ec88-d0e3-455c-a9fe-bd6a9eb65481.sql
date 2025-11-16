-- Update complaints table to support multiple file URLs
ALTER TABLE public.complaints 
DROP COLUMN file_url;

ALTER TABLE public.complaints 
ADD COLUMN file_urls text[] DEFAULT '{}';

COMMENT ON COLUMN public.complaints.file_urls IS 'Array of file URLs for attachments';