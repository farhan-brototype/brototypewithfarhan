import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface Emergency {
  id: string;
  description: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const Emergencies = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from("emergencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data) {
        const userIds = [...new Set(data.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const emergenciesWithProfiles = data.map(emergency => ({
          ...emergency,
          profiles: profiles?.find(p => p.id === emergency.user_id) || { full_name: null, email: "" }
        }));

        setEmergencies(emergenciesWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching emergencies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Emergency Records</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Emergencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emergencies.length === 0 ? (
              <p className="text-muted-foreground">No emergency records found.</p>
            ) : (
              emergencies.map((emergency) => (
                <div key={emergency.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {emergency.profiles?.full_name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-muted-foreground">{emergency.profiles?.email}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(emergency.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-sm">{emergency.description}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Emergencies;
