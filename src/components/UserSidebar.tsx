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
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-main.png";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";

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
  const { counts: notificationCounts } = useNotificationCounts();

  const handleNavClick = () => {
    setOpen(false);
  };

  const getNotificationCount = (url: string) => {
    if (url.includes("assignment")) return notificationCounts.assignment;
    if (url.includes("complaint")) return notificationCounts.complaint;
    if (url.includes("emergency")) return notificationCounts.emergency;
    return 0;
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
              {items.map((item) => {
                const count = getNotificationCount(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === "/dashboard"} onClick={handleNavClick}>
                        <item.icon />
                        <span>{item.title}</span>
                        {count > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {count}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}