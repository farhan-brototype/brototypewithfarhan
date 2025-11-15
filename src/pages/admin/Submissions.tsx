import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, Download } from "lucide-react";

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  comments: string | null;
  file_urls: string[] | null;
  submitted_at: string;
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

const Submissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

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
      setUsers(data.map(u => ({ id: u.id, name: u.full_name || u.email })));
    }
  };

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from("assignment_submissions")
      .select(`
        *,
        assignments (title, description, due_date),
        profiles (full_name, email)
      `)
      .order("submitted_at", { ascending: false });

    if (data) {
      setSubmissions(data as any);
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
                <Badge variant="default">{submission.status}</Badge>
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

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <h4 className="font-semibold mb-2">Comments</h4>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;
