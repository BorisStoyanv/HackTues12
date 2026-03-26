"use client";

import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Filter,
  Landmark,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PublicExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Mini Navigation */}
      <header className="z-50 border-b bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold tracking-tight hidden sm:inline-block">
                OpenFairTrip
              </span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects or cities..."
                className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Link
              href="/login"
              className={buttonVariants({
                size: "sm",
                className: "h-8",
              })}
            >
              Sign In to Vote
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
         <ProposalExplorer mode="public" searchQuery={searchQuery} />
      </main>
    </div>
  );
}
