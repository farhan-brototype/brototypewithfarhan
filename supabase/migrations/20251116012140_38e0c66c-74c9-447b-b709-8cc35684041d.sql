-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignments', 'assignments', false), ('complaints', 'complaints', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assignments
CREATE POLICY "Users can upload own assignment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own assignment files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignments' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Storage policies for complaints
CREATE POLICY "Users can upload own complaint files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'complaints' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own complaint files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'complaints' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all complaint files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'complaints' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create default chat rooms if they don't exist
INSERT INTO chat_rooms (id, name, type) VALUES
  (gen_random_uuid(), 'Admin All Users', 'admin_all_users'),
  (gen_random_uuid(), 'All Users', 'all_users')
ON CONFLICT DO NOTHING;

-- Update chat_messages policies to allow updates for read receipts
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

CREATE POLICY "Users can send messages"
ON chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view messages"
ON chat_messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update read status"
ON chat_messages FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link);
END;
$$;

-- Trigger for assignment notifications
CREATE OR REPLACE FUNCTION notify_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'New Assignment',
      'You have been assigned: ' || NEW.title,
      'assignment',
      '/dashboard/assignment'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_assignment_created ON assignments;
CREATE TRIGGER on_assignment_created
  AFTER INSERT ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_created();

-- Trigger for grade notifications
CREATE OR REPLACE FUNCTION notify_grade_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND OLD.grade IS NULL THEN
    PERFORM create_notification(
      NEW.user_id,
      'Assignment Graded',
      'Your assignment has been graded',
      'grade',
      '/dashboard/assignment'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_grade_posted ON assignment_submissions;
CREATE TRIGGER on_grade_posted
  AFTER UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_grade_posted();

-- Trigger for complaint status change notifications
CREATE OR REPLACE FUNCTION notify_complaint_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM create_notification(
      NEW.user_id,
      'Complaint Status Updated',
      'Your complaint status has been changed to: ' || NEW.status,
      'complaint',
      '/dashboard/complaint'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_complaint_status_change ON complaints;
CREATE TRIGGER on_complaint_status_change
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_complaint_status_change();

-- Trigger for emergency notifications to admins
CREATE OR REPLACE FUNCTION notify_emergency_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify all admins
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'Emergency Alert', 'A new emergency has been reported', 'emergency', '/admin/emergencies'
  FROM user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_emergency_created ON emergencies;
CREATE TRIGGER on_emergency_created
  AFTER INSERT ON emergencies
  FOR EACH ROW
  EXECUTE FUNCTION notify_emergency_created();