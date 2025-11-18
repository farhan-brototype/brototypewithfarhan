import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileUpload } from "@/components/FileUpload";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  file_urls?: string[];
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500",
  in_progress: "bg-yellow-500",
  under_review: "bg-orange-500",
  resolved: "bg-green-500",
};

const Complaint = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file_urls: [] as string[],
  });
  const { markAsRead } = useNotificationCounts();

  useEffect(() => {
    loadComplaints();
    markAsRead("complaint");
  }, []);

  const loadComplaints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComplaints(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("complaints").insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      file_urls: formData.file_urls,
    });

    if (error) {
      toast.error("Failed to submit complaint");
      return;
    }

    toast.success("Complaint submitted successfully");
    setFormData({ title: "", description: "", file_urls: [] });
    setShowForm(false);
    loadComplaints();
  };

  const adminWhatsApp = "9037133475";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Complaints</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`https://wa.me/${adminWhatsApp}`, "_blank")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat Admin
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "View History" : "Register New Complaint"}
          </Button>
        </div>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Register New Complaint</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Attachments (Optional)</Label>
                <FileUpload
                  bucket="complaints"
                  onUploadComplete={(urls) => setFormData({ ...formData, file_urls: urls })}
                  existingFiles={formData.file_urls}
                />
              </div>
              <Button type="submit">Submit Complaint</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{complaint.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(complaint.created_at), "PPP")}
                    </p>
                  </div>
                  <Badge className={statusColors[complaint.status]}>
                    {complaint.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{complaint.description}</p>
                {complaint.file_urls && complaint.file_urls.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Attachments:</p>
                    {complaint.file_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm block"
                      >
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {complaints.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No complaints registered yet
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Complaint;