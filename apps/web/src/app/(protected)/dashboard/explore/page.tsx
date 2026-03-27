"use client";

import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { fetchAllProposals, SerializedProposal } from "@/lib/actions/proposals";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Globe, Activity, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormEvent, Suspense, useEffect, useState } from "react";

function DashboardExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const initialSelectedId = searchParams.get("id");
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

  // Platform-wide metrics for the explorer
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  const activeNodes = safeProposals.reduce((acc, p) => acc + (p?.voter_count || 0), 0);
  const totalPledged = safeProposals.reduce((acc, p) => acc + (p?.budget_amount || 0), 0);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputValue.trim();

    router.replace(
      nextQuery
        ? `/dashboard/explore?q=${encodeURIComponent(nextQuery)}`
        : "/dashboard/explore",
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* High-Fidelity Header - Stable Grid Layout */}
      <div className="border-b bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
        <div className="px-6 py-4 md:px-8 grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          
          {/* Left: Branding & Title (Stable) */}
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
               <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                Impact Explorer
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">
                Governance Ledger
              </p>
            </div>
          </div>

          {/* Center: Search Protocol */}
          <form
            onSubmit={handleSearch}
            className="relative group w-full max-w-md mx-auto"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              name="q"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search ID, title or region..."
              className="h-10 pl-10 bg-neutral-100/50 dark:bg-neutral-900/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/40 transition-all rounded-xl text-xs shadow-inner"
            />
          </form>

          {/* Right: Network Stats */}
          <div className="hidden md:flex items-center justify-end gap-10">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.1em]">Nodes Active</span>
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-foreground">
                   <Users className="h-3.5 w-3.5 text-blue-500" />
                   {activeNodes.toLocaleString()}
                </div>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.1em]">Platform Cap</span>
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-foreground">
                   <Activity className="h-3.5 w-3.5 text-primary" />
                   ${(totalPledged / 1000).toFixed(1)}k
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Explorer Interface */}
      <div className="flex-1 overflow-hidden">
        <ProposalExplorer 
          mode="authenticated" 
          proposals={proposals} 
          searchQuery={searchQuery}
          initialSelectedId={initialSelectedId}
        />
      </div>
    </div>
  );
}

export default function DashboardExplorePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <DashboardExploreContent />
    </Suspense>
  );
}
