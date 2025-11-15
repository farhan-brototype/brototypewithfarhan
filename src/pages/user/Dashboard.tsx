import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle, Phone, Gamepad2 } from "lucide-react";

const UserDashboard = () => {
  const [stats, setStats] = useState({
    assignments: 0,
    complaints: 0,
    emergencies: 0,
    refreshmentMinutes: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const [assignments, complaints, emergencies, refreshment] = await Promise.all([
      supabase.from("assignments").select("id", { count: "exact" }).eq("assigned_to", user.id),
      supabase.from("complaints").select("id", { count: "exact" }).eq("user_id", user.id).gte("created_at", today),
      supabase.from("emergencies").select("id", { count: "exact" }).eq("user_id", user.id).gte("created_at", today),
      supabase.from("refreshment_usage").select("minutes_used").eq("user_id", user.id).eq("date", today).single(),
    ]);

    setStats({
      assignments: assignments.count || 0,
      complaints: complaints.count || 0,
      emergencies: emergencies.count || 0,
      refreshmentMinutes: refreshment.data?.minutes_used || 0,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignments}</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complaints}</div>
            <p className="text-xs text-muted-foreground">Registered today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergencies Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emergencies}</div>
            <p className="text-xs text-muted-foreground">Reported today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refreshment Time</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.refreshmentMinutes} min</div>
            <p className="text-xs text-muted-foreground">Used today / 30 min</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;