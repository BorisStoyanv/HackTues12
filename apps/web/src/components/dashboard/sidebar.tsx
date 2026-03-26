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
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth-store";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Explore",
    href: "/dashboard/explore",
    icon: Globe,
  },
  {
    title: "New Proposal",
    href: "/proposals/new",
    icon: FilePlus,
  },
  {
    title: "Voting History",
    href: "/history",
    icon: History,
  },
];

const secondaryItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Identity Status",
    href: "/onboarding/status",
    icon: ShieldCheck,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800">
      <SidebarHeader className="h-14 flex items-center px-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary shrink-0" />
          <span className="font-bold tracking-tight truncate group-data-[collapsible=icon]:hidden">
            OpenFairTrip
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu className="px-2 pt-4">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.title}
                className={cn(
                  "transition-colors",
                  pathname === item.href 
                    ? "bg-primary/5 text-primary font-semibold" 
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                )}
                render={(props) => (
                  <Link href={item.href} {...props}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="mt-8 px-4 mb-2 group-data-[collapsible=icon]:hidden">
           <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
             Account & Security
           </p>
        </div>

        <SidebarMenu className="px-2">
          {secondaryItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.title}
                className={cn(
                  "transition-colors",
                  pathname === item.href 
                    ? "bg-primary/5 text-primary font-semibold" 
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                )}
                render={(props) => (
                  <Link href={item.href} {...props}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
              <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border shrink-0">
                <span className="text-xs font-bold">{user?.email?.[0].toUpperCase() || "U"}</span>
              </div>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-semibold truncate leading-tight">
                  {user?.email || "User Account"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
                  {user?.role || "Citizen"}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
