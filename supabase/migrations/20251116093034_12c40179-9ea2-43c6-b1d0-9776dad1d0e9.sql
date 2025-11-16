-- Create assignments bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for assignments bucket
CREATE POLICY "Users can upload their own assignment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignments' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can delete their own assignment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignments' 
  AND has_role(auth.uid(), 'admin'::app_role)
);