import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
}

const Assignment = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    loadAssignments();
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

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Assignments</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => {
          const daysUntilDue = getDaysUntilDue(assignment.due_date);
          return (
            <Card
              key={assignment.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedAssignment(assignment)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  {daysUntilDue <= 3 && daysUntilDue >= 0 && (
                    <Badge variant="destructive">Due Soon</Badge>
                  )}
                  {daysUntilDue < 0 && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
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
        <DialogContent>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignment;