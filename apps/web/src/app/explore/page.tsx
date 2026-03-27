"use client";

import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { buttonVariants } from "@/components/ui/button";
import { fetchAllProposals, SerializedProposal } from "@/lib/actions/proposals";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark } from "lucide-react";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";

function PublicExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(searchQuery);
  const [proposals, setProposals] = useState<SerializedProposal[]>([]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    fetchAllProposals().then((result) => {
      if (cancelled) return;
      setProposals(result.success && result.proposals ? result.proposals : []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputValue.trim();

    router.replace(
      nextQuery ? `/explore?q=${encodeURIComponent(nextQuery)}` : "/explore",
    );
  };

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
            <form
              onSubmit={handleSearch}
              className="relative w-64 hidden md:block"
            >
               <input
                name="q"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Search projects..."
                className="pl-3 h-9 w-full rounded-md bg-muted/50 border-none text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </form>
          </div>
          <div className="flex items-center gap-2">
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
        <ProposalExplorer
          proposals={proposals}
          mode="public"
          searchQuery={searchQuery}
        />
      </main>
    </div>
  );
}

export default function PublicExplorePage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-background" />}>
      <PublicExploreContent />
    </Suspense>
  );
}
