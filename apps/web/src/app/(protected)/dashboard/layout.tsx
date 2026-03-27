"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	// const { logout } = useInternetIdentity();

	const getPageTitle = () => {
		if (pathname === "/dashboard") return "Overview";
		if (pathname === "/dashboard/explore") return "Map Explorer";
		if (pathname === "/dashboard/proposals/new") return "Submit Proposal";
		if (pathname === "/dashboard/proposals/detail")
			return "Proposal Detail";
		if (pathname === "/dashboard/contracts/detail")
			return "Contract Detail";
		return "Dashboard";
	};

	return (
		<SidebarProvider>
			<DashboardSidebar />
			<div className="flex flex-1 flex-col">
				<header className="flex h-14 shrink-0 items-center gap-4 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-background/80 backdrop-blur-md sticky top-0 z-50">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<Breadcrumb className="flex-1">
						<BreadcrumbList>
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="/dashboard">
									Platform
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>
									{getPageTitle()}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<div className="ml-auto flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground h-8 px-2 md:px-3 gap-2"
							onClick={() =>
								alert(
									"Logout functionality is currently disabled for demo purposes.",
								)
							}
						>
							<LogOut className="h-4 w-4" />
							<span className="hidden md:inline text-xs font-medium">
								Logout
							</span>
						</Button>
					</div>
				</header>
				<main className="flex-1 overflow-hidden">{children}</main>
			</div>
		</SidebarProvider>
	);
}
