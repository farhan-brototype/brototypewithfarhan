import { Home, FileText, AlertCircle, Phone, Gamepad2, MessageSquare, User, Bot } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo-main.png";

const items = [
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Assignment", url: "/dashboard/assignment", icon: FileText },
  { title: "Complaint", url: "/dashboard/complaint", icon: AlertCircle },
  { title: "Emergency", url: "/dashboard/emergency", icon: Phone },
  { title: "Refreshment", url: "/dashboard/refreshment", icon: Gamepad2 },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "AI Assistant", url: "/dashboard/ai-chat", icon: Bot },
];

export function UserSidebar() {
  const { open, setOpen } = useSidebar();

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center justify-center">
          <img src={logo} alt="Brototype" className={open ? "h-8" : "h-6"} />
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} onClick={handleNavClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}