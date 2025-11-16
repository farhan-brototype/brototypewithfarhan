-- Create trigger function to notify admins when complaint is submitted
CREATE OR REPLACE FUNCTION public.notify_complaint_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify all admins about new complaint
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'New Complaint', 'A new complaint has been submitted', 'complaint', '/admin/complaints'
  FROM user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new complaints
DROP TRIGGER IF EXISTS on_complaint_created ON public.complaints;
CREATE TRIGGER on_complaint_created
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_complaint_created();