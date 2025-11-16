import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  comments: string | null;
  file_urls: string[] | null;
  submitted_at: string;
  grade: number | null;
  admin_feedback: string | null;
  graded_at: string | null;
  graded_by: string | null;
  assignments: {
    title: string;
    description: string;
    due_date: string;
  };
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface GradeHistory {
  id: string;
  grade: number;
  feedback: string | null;
  graded_at: string;
  graded_by: string;
}

const Submissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [gradeHistory, setGradeHistory] = useState<GradeHistory[]>([]);
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    loadSubmissions();
    loadUsers();

    const channel = supabase
      .channel('submissions')
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

  useEffect(() => {
    applyFilters();
  }, [submissions, filterUser, filterStatus]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (data) {
      // Filter out admins from the user list
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const nonAdminUsers = data.filter(u => !adminIds.has(u.id));
      
      setUsers(nonAdminUsers.map(u => ({ id: u.id, name: u.full_name || u.email })));
    }
  };

  const loadSubmissions = async () => {
    const { data: submissionsData, error } = await supabase
      .from("assignment_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Submissions error:", error);
      return;
    }

    if (submissionsData && submissionsData.length > 0) {
      // Fetch related assignments
      const assignmentIds = [...new Set(submissionsData.map(s => s.assignment_id))];
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("id, title, description, due_date")
        .in("id", assignmentIds);

      // Fetch related profiles
      const userIds = [...new Set(submissionsData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      // Map the data
      const enrichedSubmissions = submissionsData.map(submission => ({
        ...submission,
        assignments: assignmentsData?.find(a => a.id === submission.assignment_id) || { title: "", description: "", due_date: "" },
        profiles: profilesData?.find(p => p.id === submission.user_id) || { full_name: null, email: "" }
      }));

      setSubmissions(enrichedSubmissions as any);
    } else {
      setSubmissions([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    if (filterUser !== "all") {
      filtered = filtered.filter(s => s.user_id === filterUser);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    setFilteredSubmissions(filtered);
  };

  const loadGradeHistory = async (submissionId: string) => {
    const { data } = await supabase
      .from("grade_history")
      .select("*")
      .eq("submission_id", submissionId)
      .order("graded_at", { ascending: false });

    if (data) {
      setGradeHistory(data);
    }
  };

  const handleGrade = async (status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return;
    
    const gradeValue = parseInt(grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast.error("Please enter a valid grade between 0 and 100");
      return;
    }

    setIsGrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          status,
          grade: gradeValue,
          admin_feedback: feedback,
          graded_at: new Date().toISOString(),
          graded_by: user?.id
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      toast.success(`Submission ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedSubmission(null);
      setGrade("");
      setFeedback("");
      loadSubmissions();
    } catch (error) {
      toast.error("Failed to grade submission");
      console.error(error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    if (!open) {
      setSelectedSubmission(null);
      setGrade("");
      setFeedback("");
      setGradeHistory([]);
    }
  };

  useEffect(() => {
    if (selectedSubmission) {
      setGrade(selectedSubmission.grade?.toString() || "");
      setFeedback(selectedSubmission.admin_feedback || "");
      loadGradeHistory(selectedSubmission.id);
    }
  }, [selectedSubmission]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Assignment Submissions</h1>

      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSubmissions.map((submission) => (
          <Card
            key={submission.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedSubmission(submission)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{submission.assignments.title}</CardTitle>
                <Badge 
                  variant={
                    submission.status === 'approved' ? 'default' :
                    submission.status === 'rejected' ? 'destructive' :
                    'secondary'
                  }
                  className={
                    submission.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                    submission.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  }
                >
                  {submission.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {submission.profiles.full_name || submission.profiles.email}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Submitted: {format(new Date(submission.submitted_at), "PPp")}
              </p>
              {submission.file_urls && submission.file_urls.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  📎 {submission.file_urls.length} file(s)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No submissions found
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedSubmission} onOpenChange={handleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.assignments.title}</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Student</h4>
                <p>{selectedSubmission.profiles.full_name || selectedSubmission.profiles.email}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Assignment Details</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedSubmission.assignments.description}
                </p>
                <p className="text-sm mt-2">
                  Due Date: {format(new Date(selectedSubmission.assignments.due_date), "PPP")}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Submission Details</h4>
                <p className="text-sm">
                  <span className="font-medium">Submitted:</span>{" "}
                  {format(new Date(selectedSubmission.submitted_at), "PPP 'at' p")}
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Status:</span>{" "}
                  <Badge>{selectedSubmission.status}</Badge>
                </p>
              </div>

              {selectedSubmission.comments && (
                <div>
                  <h4 className="font-semibold mb-2">Student Comments</h4>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.comments}</p>
                </div>
              )}

              {selectedSubmission.file_urls && selectedSubmission.file_urls.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Submitted Files</h4>
                  <div className="space-y-2">
                    {selectedSubmission.file_urls.map((url, idx) => {
                      const fileName = url.split('/').pop() || `file-${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4" />
                            <span className="text-sm">{fileName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold">Grade Submission</h4>
                
                <div>
                  <Label htmlFor="grade">Grade (0-100)</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Enter grade"
                  />
                </div>

                <div>
                  <Label htmlFor="feedback">Admin Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback to the student..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGrade('approved')}
                    disabled={isGrading || !grade}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleGrade('rejected')}
                    disabled={isGrading || !grade}
                    variant="destructive"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>

              {selectedSubmission.grade !== null && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Current Grade</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-2xl font-bold">{selectedSubmission.grade}/100</p>
                    {selectedSubmission.admin_feedback && (
                      <p className="text-sm mt-2">{selectedSubmission.admin_feedback}</p>
                    )}
                    {selectedSubmission.graded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Graded: {format(new Date(selectedSubmission.graded_at), "PPP 'at' p")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {gradeHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Grade History</h4>
                  <div className="space-y-2">
                    {gradeHistory.map((history) => (
                      <div key={history.id} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg">{history.grade}/100</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(history.graded_at), "PPP 'at' p")}
                          </span>
                        </div>
                        {history.feedback && (
                          <p className="mt-2 text-muted-foreground">{history.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;
