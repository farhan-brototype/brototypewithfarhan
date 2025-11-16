import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Calendar, User } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
  assignedToProfile?: {
    full_name: string | null;
    email: string;
  };
  assignedByProfile?: {
    full_name: string | null;
    email: string;
  };
}

const Assignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    due_date: "",
    assigned_to: ""
  });

  useEffect(() => {
    loadAssignments();
    loadUsers();

    const channel = supabase
      .channel('assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
        },
        () => {
          loadAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (data) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const nonAdminUsers = data.filter(u => !adminIds.has(u.id));
      
      setUsers(nonAdminUsers.map(u => ({ id: u.id, name: u.full_name || u.email })));
    }
  };

  const loadAssignments = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const assignmentsWithProfiles = await Promise.all(
        data.map(async (assignment) => {
          let assignedToProfile = null;
          let assignedByProfile = null;

          if (assignment.assigned_to) {
            const { data: toProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", assignment.assigned_to)
              .single();
            assignedToProfile = toProfile;
          }

          if (assignment.assigned_by) {
            const { data: byProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", assignment.assigned_by)
              .single();
            assignedByProfile = byProfile;
          }

          return {
            ...assignment,
            assignedToProfile,
            assignedByProfile
          };
        })
      );

      setAssignments(assignmentsWithProfiles);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAssignment.assigned_to) {
      toast.error("Please select a user");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("assignments").insert({
        assigned_to: newAssignment.assigned_to,
        assigned_by: user?.id,
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.due_date
      });

      if (error) throw error;

      toast.success("Assignment created successfully");
      setNewAssignment({ title: "", description: "", due_date: "", assigned_to: "" });
      setIsDialogOpen(false);
      loadAssignments();
    } catch (error: any) {
      toast.error(error.message || "Failed to create assignment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assignments</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select
                  value={newAssignment.assigned_to}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Create Assignment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span className="line-clamp-2">{assignment.title}</span>
                {assignment.due_date && (
                  <Badge variant={new Date(assignment.due_date) < new Date() ? "destructive" : "default"}>
                    {new Date(assignment.due_date) < new Date() ? "Overdue" : "Active"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignment.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {assignment.description}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium">
                    {assignment.assignedToProfile?.full_name || assignment.assignedToProfile?.email || "N/A"}
                  </span>
                </div>
                {assignment.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due:</span>
                    <span className="font-medium">
                      {format(new Date(assignment.due_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Created {format(new Date(assignment.created_at), "MMM dd, yyyy")}
                  {assignment.assignedByProfile && (
                    <> by {assignment.assignedByProfile.full_name || assignment.assignedByProfile.email}</>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No assignments created yet. Click "Create Assignment" to add one.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Assignments;
