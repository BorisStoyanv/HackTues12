"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isExplorerRoute = pathname === "/dashboard/explore";
  
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname === "/dashboard/explore") return "Map Explorer";
    if (pathname === "/dashboard/proposals/new") return "Submit Proposal";
    if (pathname === "/dashboard/proposals/detail") return "Proposal Detail";
    if (pathname === "/dashboard/proposals/fund") return "Back Project";
    if (pathname === "/dashboard/proposals/vote") return "Sign Consensus";
    if (pathname === "/dashboard/contracts/detail") return "Contract Detail";
    return "Dashboard";
  };

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <div className="flex h-svh min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">
                  Platform
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main
          className={
            isExplorerRoute
              ? "min-h-0 flex-1 overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          }
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
