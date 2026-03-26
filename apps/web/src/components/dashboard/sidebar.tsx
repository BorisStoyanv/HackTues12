"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  FilePlus,
  History,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Landmark,
  ExternalLink,
  LifeBuoy,
  Send,
  LogOut,
  Briefcase,
  FileText,
  UserCheck,
  Activity,
  CreditCard
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth-store";

const mainNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Explore Map",
    href: "/dashboard/explore",
    icon: Globe,
  },
];

const proposalItems = [
  {
    title: "Submit Proposal",
    href: "/dashboard/proposals/new",
    icon: FilePlus,
  },
  {
    title: "Active Governance",
    href: "/dashboard/governance",
    icon: Activity,
  },
  {
    title: "My Submissions",
    href: "/dashboard/proposals/mine",
    icon: Briefcase,
  },
];

const platformItems = [
  {
    title: "Impact Ledger",
    href: "/dashboard/ledger",
    icon: FileText,
  },
  {
    title: "Trust Contracts",
    href: "/dashboard/contracts",
    icon: CreditCard,
  },
  {
    title: "Audit Logs",
    href: "/dashboard/audit",
    icon: History,
  },
];

const accountItems = [
  {
    title: "Identity Status",
    href: "/dashboard/verification",
    icon: UserCheck,
  },
  {
    title: "Account Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const NavGroup = ({ title, items }: { title: string; items: typeof mainNavItems }) => (
    <div className="py-4">
      <div className="px-4 mb-2 group-data-[collapsible=icon]:hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
          {title}
        </p>
      </div>
      <SidebarMenu className="px-2">
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={item.title}
              className={cn(
                "h-10 transition-all duration-200 rounded-lg",
                pathname === item.href 
                  ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" 
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-muted-foreground hover:text-foreground"
              )}
              render={(props) => (
                <Link href={item.href} {...props}>
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium tracking-tight">{item.title}</span>
                </Link>
              )}
            />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-100 dark:border-neutral-900 bg-background transition-all duration-500">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-neutral-100 dark:border-neutral-900">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
             <Landmark className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-black text-lg tracking-tighter truncate group-data-[collapsible=icon]:hidden">
            OpenFairTrip
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-hide overflow-y-auto overflow-x-hidden">
        <NavGroup title="Main" items={mainNavItems} />
        <NavGroup title="Governance" items={proposalItems} />
        <NavGroup title="Transparency" items={platformItems} />
        <NavGroup title="Personal" items={accountItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-100 dark:border-neutral-900 p-2 bg-neutral-50/50 dark:bg-neutral-950/50">
        <SidebarMenu>
          <SidebarMenuItem>
             <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-4 p-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 rounded-xl bg-background border-2 border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <span className="text-xs font-black">{user?.id?.[0].toUpperCase() || "U"}</span>
                  </div>
                  <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-black truncate leading-tight tracking-tight">
                      {user?.id ? `@${user.id.substring(0, 8)}...` : "Identity Initializing"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                       <span className="text-[10px] text-muted-foreground truncate uppercase font-black tracking-widest">
                         {user?.role || "Resident"}
                       </span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:mt-2 transition-all duration-300"
                  onClick={() => logout()}
                  title="Logout from ICP"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
