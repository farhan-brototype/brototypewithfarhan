import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, AlertCircle, Phone, Gamepad2 } from "lucide-react";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    assignmentsToday: 0,
    complaintsToday: 0,
    emergenciesToday: 0,
    avgRefreshmentUsage: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [users, assignments, complaints, emergencies, refreshment] = await Promise.all([
      supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "user"),
      supabase.from("assignments").select("id", { count: "exact" }).gte("created_at", today),
      supabase.from("complaints").select("id", { count: "exact" }).gte("created_at", today),
      supabase.from("emergencies").select("id", { count: "exact" }).gte("created_at", today),
      supabase.from("refreshment_usage").select("minutes_used").eq("date", today),
    ]);

    const avgMinutes = refreshment.data
      ? Math.round(refreshment.data.reduce((sum, r) => sum + r.minutes_used, 0) / refreshment.data.length || 0)
      : 0;

    setStats({
      totalUsers: users.count || 0,
      assignmentsToday: assignments.count || 0,
      complaintsToday: complaints.count || 0,
      emergenciesToday: emergencies.count || 0,
      avgRefreshmentUsage: avgMinutes,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments Today</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignmentsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complaintsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergencies Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emergenciesToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Game Time</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRefreshmentUsage} min</div>
            <p className="text-xs text-muted-foreground">Per user today</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
