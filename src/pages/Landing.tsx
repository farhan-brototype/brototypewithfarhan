import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo-main.png";
import { ArrowRight, Laptop } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    background: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-primary/10" />
        
        {/* Evolution Animation */}
        <div className="relative z-10 mb-12">
          <div className="flex items-end space-x-8 animate-in fade-in duration-1000">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="animate-in slide-in-from-left duration-700"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {idx < 5 ? (
                  <div className={`w-16 h-24 bg-gradient-to-b from-gray-700 to-gray-900 rounded-t-full ${
                    idx === 0 ? 'h-20' : idx === 1 ? 'h-22' : idx === 2 ? 'h-24' : idx === 3 ? 'h-26' : 'h-28'
                  }`} />
                ) : (
                  <div className="relative">
                    <Laptop className="w-16 h-16 text-primary animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Loading Text */}
        <div className="relative z-10 text-center">
          <p className="text-gray-400 text-lg mb-4">Warning : A bright</p>
          <p className="text-gray-400 text-lg mb-6">future is loading</p>
          
          {/* Progress Bar */}
          <div className="w-80 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-orange-500 to-primary animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 backdrop-blur-sm sticky top-0 z-50 bg-black/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={logo} alt="Brototype" className="h-12" />
          <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-32 text-center relative min-h-[70vh] flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-orange-500/10 to-primary/10 blur-3xl -z-10" />
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Want to Dive Into Your Dashboard?
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
          Access your personalized learning dashboard, track assignments, and manage your progress
        </p>

        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-white animate-in fade-in duration-1000 delay-300 mb-12"
          onClick={() => navigate("/auth")}
        >
          Sign In to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="mt-8">
          <p className="text-gray-400 mb-4">New to Brototype?</p>
          <Button
            size="lg"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Apply for Brocamp <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-white">Apply for Brocamp</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Start your journey to becoming a software engineer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name" className="text-gray-200">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-200">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-200">Phone *</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  placeholder="+91 1234567890"
                />
              </div>

              <div>
                <Label htmlFor="background" className="text-gray-200">Educational Background *</Label>
                <Select value={formData.background} onValueChange={(value) => setFormData({ ...formData, background: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select your background" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="it" className="text-white">IT Background</SelectItem>
                    <SelectItem value="non-it" className="text-white">Non-IT Background</SelectItem>
                    <SelectItem value="student" className="text-white">Current Student</SelectItem>
                    <SelectItem value="professional" className="text-white">Working Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message" className="text-gray-200">Tell us about yourself (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  placeholder="Why do you want to become a software engineer?"
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white"
                size="lg"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2024 Brototype. All rights reserved.</p>
          <p className="mt-2">THE BROTHER YOU NEVER HAD</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;