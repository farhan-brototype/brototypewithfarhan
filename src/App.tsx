import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import UserLayout from "./pages/user/UserLayout";
import UserDashboard from "./pages/user/Dashboard";
import Assignment from "./pages/user/Assignment";
import Complaint from "./pages/user/Complaint";
import Emergency from "./pages/user/Emergency";
import Refreshment from "./pages/user/Refreshment";
import Chat from "./pages/user/Chat";
import Profile from "./pages/user/Profile";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<UserLayout />}>
            <Route index element={<UserDashboard />} />
            <Route path="assignment" element={<Assignment />} />
            <Route path="complaint" element={<Complaint />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="refreshment" element={<Refreshment />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
