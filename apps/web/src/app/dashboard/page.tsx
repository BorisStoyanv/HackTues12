"use client";

import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Users, 
  BarChart3, 
  ShieldCheck, 
  MapPin,
  TrendingUp,
  Activity,
  ChevronRight
} from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const stats = [
    {
      title: "Reputation Score",
      value: "150 $V_p$",
      description: "Based on geographic verification",
      icon: ShieldCheck,
      trend: "+12% this month",
    },
    {
      title: "Local Eligibility",
      value: user?.detected_location?.city || "Verified",
      description: user?.detected_location?.country || "Citizen",
      icon: MapPin,
    },
    {
      title: "Active Votes",
      value: "12",
      description: "Participation in 3 regions",
      icon: Users,
    },
    {
      title: "Integrity Factor",
      value: "0.98",
      description: "Top 5% of community",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-neutral-50/50 dark:bg-neutral-950/50 p-6">
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.email?.split('@')[0]}</h1>
        <p className="text-muted-foreground text-lg">
          Monitor your local governance impact and reputation standing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-neutral-200 dark:border-neutral-800 shadow-none hover:border-primary/20 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              {stat.trend && (
                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                   <Activity className="h-3 w-3" />
                   {stat.trend}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <Card className="col-span-4 border-neutral-200 dark:border-neutral-800 shadow-none">
            <CardHeader>
               <CardTitle>Recent Activity</CardTitle>
               <CardDescription>
                  Your governance contributions over the last 30 days.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground italic text-sm">
                  Reputation graph visualization placeholder
               </div>
            </CardContent>
         </Card>
         <Card className="col-span-3 border-neutral-200 dark:border-neutral-800 shadow-none">
            <CardHeader>
               <CardTitle>Regional Alerts</CardTitle>
               <CardDescription>
                  Active proposals in {user?.detected_location?.city || "your region"}.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors cursor-pointer group">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">Infrastructure Project #{i}42</p>
                          <p className="text-xs text-muted-foreground">Voting ends in 2 days</p>
                       </div>
                       <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  </div>
  );
}
