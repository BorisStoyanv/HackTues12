"use client";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { Landmark } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const user = useAuthStore((state) => state.user);
  const is_logged_in = !!user;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary rounded-lg p-1.5 transition-transform group-hover:rotate-12">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            OpenFairTrip
          </span>
        </Link>
        <nav className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/explore"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Explore Map
            </Link>
            <Link
              href="/about"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              How it Works
            </Link>
          </div>
          
          <div className="h-4 w-px bg-border hidden sm:block" />

          {is_logged_in ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end leading-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">
                  Network Active
                </span>
                <span className="text-xs font-mono font-bold">
                  {user.id.substring(0, 8)}...
                </span>
              </div>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({
                  variant: "default",
                  size: "sm",
                }), "rounded-full px-5 font-bold shadow-lg shadow-primary/20")}
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({
                variant: "default",
                size: "sm",
              }), "rounded-full px-5 font-bold")}
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
