import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  background: string | null;
  message: string | null;
  created_at: string;
}

const CourseApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { markAsRead } = useNotificationCounts();

  useEffect(() => {
    fetchApplications();
    markAsRead("application");
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("course_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Course Applications</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Applications ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-muted-foreground">No applications found.</p>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{app.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                      <p className="text-sm text-muted-foreground">{app.phone}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(app.created_at), "PPp")}
                    </span>
                  </div>
                  {app.background && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Background:</p>
                      <p className="text-sm">{app.background}</p>
                    </div>
                  )}
                  {app.message && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Message:</p>
                      <p className="text-sm">{app.message}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseApplications;
