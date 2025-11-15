import { Home, FileText, AlertCircle, Phone, Gamepad2, MessageSquare, User } from "lucide-react";
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
import logo from "@/assets/brototype-logo.svg";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Assignment", url: "/dashboard/assignment", icon: FileText },
  { title: "Complaint", url: "/dashboard/complaint", icon: AlertCircle },
  { title: "Emergency", url: "/dashboard/emergency", icon: Phone },
  { title: "Refreshment", url: "/dashboard/refreshment", icon: Gamepad2 },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function UserSidebar() {
  const { open } = useSidebar();

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
                    <NavLink to={item.url} end={item.url === "/dashboard"}>
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