import { Home, Users, FileText, AlertCircle, Phone, Gamepad2, MessageSquare, Contact, BookOpen, CheckSquare, BookMarked, Bot } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const items = [
  { title: "Overview", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Assignments", url: "/admin/assignments", icon: BookMarked },
  { title: "Submissions", url: "/admin/submissions", icon: CheckSquare },
  { title: "Emergencies", url: "/admin/emergencies", icon: AlertCircle },
  { title: "Complaints", url: "/admin/complaints", icon: FileText },
  { title: "Refreshment", url: "/admin/refreshment", icon: Gamepad2 },
  { title: "Contacts", url: "/admin/contacts", icon: Contact },
  { title: "Applications", url: "/admin/applications", icon: BookOpen },
  { title: "Chat", url: "/admin/chat", icon: MessageSquare },
  { title: "AI Assistant", url: "/admin/ai-chat", icon: Bot },
];

export function AdminSidebar() {
  const { open, setOpen } = useSidebar();
  const { counts: notificationCounts } = useNotificationCounts();
  const isMobile = useIsMobile();
  useRealtimeNotifications(true);

  const handleNavClick = () => {
    if (isMobile && open) {
      setOpen(false);
    }
  };

  const getNotificationCount = (url: string) => {
    if (url.includes("emergencies")) return notificationCounts.emergency;
    if (url.includes("complaints")) return notificationCounts.complaint;
    if (url.includes("applications")) return notificationCounts.application;
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
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/admin"} 
                        onClick={handleNavClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground"
                        activeClassName="bg-accent text-accent-foreground font-semibold"
                      >
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