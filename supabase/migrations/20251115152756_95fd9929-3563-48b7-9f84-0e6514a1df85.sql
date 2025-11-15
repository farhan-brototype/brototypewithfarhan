-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('assignment-files', 'assignment-files', false),
  ('complaint-files', 'complaint-files', false);

-- Create storage policies for assignment files
CREATE POLICY "Users can upload their assignment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-files' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-files' AND has_role(auth.uid(), 'admin'::app_role));

-- Create storage policies for complaint files
CREATE POLICY "Users can upload their complaint files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'complaint-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their complaint files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-files' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  comments TEXT,
  file_urls TEXT[],
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment submissions
CREATE POLICY "Users can create own submissions"
ON public.assignment_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own submissions"
ON public.assignment_submissions FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own submissions"
ON public.assignment_submissions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all submissions"
ON public.assignment_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add read_by field to chat_messages for read receipts
ALTER TABLE public.chat_messages ADD COLUMN read_by UUID[];

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for assignment_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;

-- Create trigger for updated_at on assignment_submissions
CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();