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
  Landmark,
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
    <div className="py-2">
      <div className="px-4 mb-2 group-data-[collapsible=icon]:hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          {title}
        </p>
      </div>
      <SidebarMenu className="px-2 space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                className={cn(
                  "h-9 transition-colors rounded-md px-3",
                  isActive 
                    ? "bg-neutral-100 dark:bg-neutral-900 text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-950"
                )}
                render={(props) => (
                  <Link href={item.href} {...props}>
                    <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/60")} />
                    <span className={cn("text-sm transition-colors", isActive ? "font-semibold" : "font-medium")}>
                      {item.title}
                    </span>
                  </Link>
                )}
              />
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800 bg-background">
      <SidebarHeader className="h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-foreground dark:bg-white flex items-center justify-center shrink-0">
             <Landmark className="h-3.5 w-3.5 text-background dark:text-black" />
          </div>
          <span className="font-bold text-base tracking-tight truncate group-data-[collapsible=icon]:hidden">
            OpenFairTrip
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-hide py-2">
        <NavGroup title="Main" items={mainNavItems} />
        <NavGroup title="Governance" items={proposalItems} />
        <NavGroup title="Platform" items={platformItems} />
        <NavGroup title="Account" items={accountItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 dark:border-neutral-800 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
             <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-4 p-2">
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-bold">{user?.id?.[0].toUpperCase() || "U"}</span>
                  </div>
                  <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-xs font-bold truncate leading-tight tracking-tight text-foreground">
                      {user?.id ? `@${user.id.substring(0, 8)}...` : "Initializing"}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate uppercase font-bold tracking-widest mt-0.5">
                      {user?.role || "Resident"}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                  onClick={() => logout()}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
