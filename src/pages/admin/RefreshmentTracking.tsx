import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface RefreshmentUsage {
  id: string;
  user_id: string;
  date: string;
  minutes_used: number;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const RefreshmentTracking = () => {
  const [usage, setUsage] = useState<RefreshmentUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase
        .from("refreshment_usage")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data) {
        const userIds = [...new Set(data.map(u => u.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const usageWithProfiles = data.map(record => ({
          ...record,
          profiles: profiles?.find(p => p.id === record.user_id) || { full_name: null, email: "" }
        }));

        setUsage(usageWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Refreshment Usage Tracking</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usage.length === 0 ? (
              <p className="text-muted-foreground">No usage data found.</p>
            ) : (
              usage.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {record.profiles?.full_name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-muted-foreground">{record.profiles?.email}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(record.date), "PP")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Minutes Used</span>
                      <span className="font-semibold">{record.minutes_used} / 30</span>
                    </div>
                    <Progress value={(record.minutes_used / 30) * 100} />
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

export default RefreshmentTracking;
