-- Update the notify_assignment_created function to use correct link
CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;