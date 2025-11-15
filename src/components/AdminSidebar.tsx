import { Home, Users, FileText, AlertCircle, Phone, Gamepad2, MessageSquare, Contact, BookOpen } from "lucide-react";
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
  { title: "Overview", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Emergencies", url: "/admin/emergencies", icon: AlertCircle },
  { title: "Complaints", url: "/admin/complaints", icon: FileText },
  { title: "Refreshment", url: "/admin/refreshment", icon: Gamepad2 },
  { title: "Contacts", url: "/admin/contacts", icon: Contact },
  { title: "Applications", url: "/admin/applications", icon: BookOpen },
  { title: "Chat", url: "/admin/chat", icon: MessageSquare },
];

export function AdminSidebar() {
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
                    <NavLink to={item.url} end={item.url === "/admin"}>
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