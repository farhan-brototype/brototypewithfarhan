-- Add grading columns to assignment_submissions
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS grade integer,
ADD COLUMN IF NOT EXISTS admin_feedback text,
ADD COLUMN IF NOT EXISTS graded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS graded_by uuid;

-- Create grade_history table for tracking all grade changes
CREATE TABLE IF NOT EXISTS grade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  grade integer NOT NULL,
  feedback text,
  graded_by uuid NOT NULL,
  graded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on grade_history
ALTER TABLE grade_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for grade_history
CREATE POLICY "Users can view their own grade history"
ON grade_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignment_submissions
    WHERE assignment_submissions.id = grade_history.submission_id
    AND assignment_submissions.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can insert grade history"
ON grade_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to automatically track grade changes
CREATE OR REPLACE FUNCTION track_grade_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL AND OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO grade_history (submission_id, grade, feedback, graded_by)
    VALUES (NEW.id, NEW.grade, NEW.admin_feedback, NEW.graded_by);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to track grade changes
DROP TRIGGER IF EXISTS track_grade_change_trigger ON assignment_submissions;
CREATE TRIGGER track_grade_change_trigger
AFTER UPDATE ON assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION track_grade_change();