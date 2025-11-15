import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  file_url: string | null;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const Complaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const complaintsWithProfiles = data.map(complaint => ({
          ...complaint,
          profiles: profiles?.find(p => p.id === complaint.user_id) || { full_name: null, email: "" }
        }));

        setComplaints(complaintsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (complaintId: string, newStatus: "submitted" | "in_progress" | "under_review" | "resolved") => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ status: newStatus })
        .eq("id", complaintId);

      if (error) throw error;

      setComplaints(complaints.map(c => 
        c.id === complaintId ? { ...c, status: newStatus } : c
      ));
      
      toast.success("Complaint status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      submitted: "default",
      in_progress: "secondary",
      under_review: "outline",
      resolved: "default"
    };
    return <Badge variant={variants[status] || "default"}>{status.replace("_", " ")}</Badge>;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Complaints Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <p className="text-muted-foreground">No complaints found.</p>
            ) : (
              complaints.map((complaint) => (
                <div key={complaint.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{complaint.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {complaint.profiles?.full_name || "Unknown"} ({complaint.profiles?.email})
                      </p>
                      <p className="text-sm mt-2">{complaint.description}</p>
                      {complaint.file_url && (
                        <a href={complaint.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          View Attachment
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(complaint.created_at), "PP")}
                      </span>
                      {getStatusBadge(complaint.status)}
                    </div>
                  </div>
                  <div className="mt-4">
                      <Select
                        value={complaint.status}
                        onValueChange={(value: "submitted" | "in_progress" | "under_review" | "resolved") => handleStatusChange(complaint.id, value)}
                      >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Complaints;
