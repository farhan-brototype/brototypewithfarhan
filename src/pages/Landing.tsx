import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/brototype-logo.svg";
import { Users, Award, TrendingUp, Target } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    background: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("course_applications")
        .insert([formData]);

      if (error) throw error;

      toast.success("Application submitted successfully!");
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        background: "",
        message: ""
      });
    } catch (error) {
      toast.error("Failed to submit application");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={logo} alt="Brototype" className="h-12" />
          <Button onClick={() => navigate("/auth")} variant="default" size="lg">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 blur-3xl -z-10" />
        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
          THE BROTHER YOU NEVER HAD
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
          If you know how to read and write in English and have the basic knowledge to do addition,
          subtraction, multiplication and division; congratulations you too can become a software engineer.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:scale-105 transition-transform">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">2254</div>
              <div className="text-sm text-muted-foreground">Students Placed</div>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 bg-gradient-to-br from-accent/50 to-transparent hover:scale-105 transition-transform">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">₹40K</div>
              <div className="text-sm text-muted-foreground">Avg Salary</div>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:scale-105 transition-transform">
            <CardContent className="pt-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Job Ready</div>
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 bg-gradient-to-br from-accent/50 to-transparent hover:scale-105 transition-transform">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">6M</div>
              <div className="text-sm text-muted-foreground">Training Period</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gradient-to-br from-accent/30 via-background to-accent/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">About Brototype</h2>
          <div className="max-w-4xl mx-auto space-y-6 text-lg leading-relaxed">
            <Card className="border-primary/20 backdrop-blur-sm bg-background/50">
              <CardContent className="pt-6">
                <p className="text-foreground/90">
                  Brototype is Kerala's leading software training institute, dedicated to transforming
                  aspiring individuals into skilled software engineers. Our unique approach combines
                  practical training with real-world project experience.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 backdrop-blur-sm bg-background/50">
              <CardContent className="pt-6">
                <p className="text-foreground/90">
                  With over 2254 students successfully placed in top companies, we pride ourselves on
                  delivering quality education that focuses on both technical skills and professional
                  development.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 backdrop-blur-sm bg-background/50">
              <CardContent className="pt-6">
                <p className="text-foreground/90">
                  Our intensive Brocamp program is designed to take you from beginner to job-ready in
                  months, not years. Join us and become part of the Brototype family.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Join Course Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Join Our Course</CardTitle>
            <CardDescription>
              Fill out the form below and our team will get back to you shortly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="background">Your Background</Label>
                <Select
                  value={formData.background}
                  onValueChange={(value) => setFormData({ ...formData, background: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT Background</SelectItem>
                    <SelectItem value="non-it">Non-IT Background</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about yourself and why you want to join..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Contact Section */}
      <section className="bg-accent text-accent-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-6">Contact Us</h3>
          <div className="flex flex-wrap justify-center gap-8">
            <div>
              <div className="font-semibold mb-2">For Admission</div>
              <div>+91 7034 395 811</div>
              <div>admissions@brototype.com</div>
            </div>
            <div>
              <div className="font-semibold mb-2">For Job Opportunities</div>
              <div>+91 7594 846 113</div>
              <div>hr@brototype.com</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Packapeer Academy Pvt Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;