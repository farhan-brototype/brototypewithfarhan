import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Emergency {
  id: string;
  description: string;
  created_at: string;
}

const Emergency = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");

  const adminPhone = "9037133475";

  useEffect(() => {
    loadEmergencies();
  }, []);

  const loadEmergencies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("emergencies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEmergencies(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("emergencies").insert({
      user_id: user.id,
      description,
    });

    if (error) {
      toast.error("Failed to submit emergency");
      return;
    }

    toast.success("Emergency reported successfully");
    setDescription("");
    setShowForm(false);
    loadEmergencies();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Emergency</h1>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => window.open(`tel:${adminPhone}`, "_blank")}
          >
            <Phone className="mr-2 h-4 w-4" />
            Call Admin
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`https://wa.me/${adminPhone}`, "_blank")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat Admin
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "View History" : "Add New Emergency"}
          </Button>
        </div>
      </div>

      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            For immediate assistance, you can call or message the admin directly using the buttons above.
          </p>
          <p className="text-sm font-semibold">Admin Phone: {adminPhone}</p>
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Report Emergency</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  placeholder="Describe the emergency situation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
              <Button type="submit" variant="destructive">Submit Emergency</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Emergency History</h2>
          {emergencies.map((emergency) => (
            <Card key={emergency.id}>
              <CardHeader>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(emergency.created_at), "PPP p")}
                </p>
              </CardHeader>
              <CardContent>
                <p>{emergency.description}</p>
              </CardContent>
            </Card>
          ))}
          {emergencies.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No emergency records yet
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Emergency;