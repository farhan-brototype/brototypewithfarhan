import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  status: string;
  comments: string | null;
  file_urls: string[] | null;
  submitted_at: string;
  grade: number | null;
  admin_feedback: string | null;
}

const Assignment = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [submissionForm, setSubmissionForm] = useState({
    comments: "",
    file_urls: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
    loadSubmissions();

    const channel = supabase
      .channel('assignment_submissions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_submissions',
        },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssignments(data);
    }
  };

  const loadSubmissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      const submissionsMap: Record<string, Submission> = {};
      data.forEach(sub => {
        submissionsMap[sub.assignment_id] = sub;
      });
      setSubmissions(submissionsMap);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("assignment_submissions").insert({
      assignment_id: selectedAssignment.id,
      user_id: user.id,
      comments: submissionForm.comments,
      file_urls: submissionForm.file_urls,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Success",
      description: "Assignment submitted successfully",
    });

    setSubmissionForm({ comments: "", file_urls: [] });
    setSelectedAssignment(null);
    setIsSubmitting(false);
    loadSubmissions();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Assignments</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => {
          const daysUntilDue = getDaysUntilDue(assignment.due_date);
          const submission = submissions[assignment.id];
          return (
            <Card
              key={assignment.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedAssignment(assignment)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <div className="flex flex-col gap-1">
                    {submission ? (
                      <Badge 
                        variant={
                          submission.status === 'approved' ? 'default' :
                          submission.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                        className={
                          submission.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                          submission.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                          daysUntilDue < 0 ? 'bg-red-600 hover:bg-red-700' :
                          'bg-green-600 hover:bg-green-700'
                        }
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {submission.status === 'approved' ? 'Approved' :
                         submission.status === 'rejected' ? 'Rejected' :
                         'Submitted'}
                      </Badge>
                    ) : (
                      <>
                        {daysUntilDue <= 3 && daysUntilDue >= 0 && (
                          <Badge variant="destructive">
                            <Clock className="h-3 w-3 mr-1" />
                            Due Soon
                          </Badge>
                        )}
                        {daysUntilDue < 0 && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Due: {format(new Date(assignment.due_date), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {assignment.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No assignments yet
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Due Date</h4>
              <p>{selectedAssignment && format(new Date(selectedAssignment.due_date), "PPP")}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedAssignment?.description}</p>
            </div>

            {selectedAssignment && submissions[selectedAssignment.id] ? (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Submission Status
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <Badge 
                      variant={
                        submissions[selectedAssignment.id].status === 'approved' ? 'default' :
                        submissions[selectedAssignment.id].status === 'rejected' ? 'destructive' :
                        'secondary'
                      }
                      className={
                        submissions[selectedAssignment.id].status === 'approved' ? 'bg-green-600' :
                        submissions[selectedAssignment.id].status === 'rejected' ? 'bg-red-600' :
                        'bg-yellow-600'
                      }
                    >
                      {submissions[selectedAssignment.id].status}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Submitted:</span>{" "}
                    {format(new Date(submissions[selectedAssignment.id].submitted_at), "PPP 'at' p")}
                  </p>
                  
                  {submissions[selectedAssignment.id].grade !== null && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h5 className="font-semibold mb-2">Grade</h5>
                      <p className="text-2xl font-bold">
                        {submissions[selectedAssignment.id].grade}/100
                      </p>
                    </div>
                  )}
                  
                  {submissions[selectedAssignment.id].admin_feedback && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h5 className="font-semibold mb-2">Instructor Feedback</h5>
                      <p className="text-sm text-muted-foreground">
                        {submissions[selectedAssignment.id].admin_feedback}
                      </p>
                    </div>
                  )}
                  
                  {submissions[selectedAssignment.id].comments && (
                    <div>
                      <span className="font-medium">Your Comments:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {submissions[selectedAssignment.id].comments}
                      </p>
                    </div>
                  )}
                  {submissions[selectedAssignment.id].file_urls && 
                   submissions[selectedAssignment.id].file_urls!.length > 0 && (
                    <div>
                      <span className="font-medium">Submitted Files:</span>
                      <div className="mt-2 space-y-1">
                        {submissions[selectedAssignment.id].file_urls!.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-primary hover:underline"
                          >
                            File {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Submit Assignment</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="comments">Comments (Optional)</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add any comments about your submission..."
                      value={submissionForm.comments}
                      onChange={(e) =>
                        setSubmissionForm({ ...submissionForm, comments: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Upload Files (Optional)</Label>
                    <FileUpload
                      bucket="assignments"
                      onUploadComplete={(urls) =>
                        setSubmissionForm({ ...submissionForm, file_urls: urls })
                      }
                      existingFiles={submissionForm.file_urls}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitAssignment}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assignment"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignment;