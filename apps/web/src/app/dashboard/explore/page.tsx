import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { fetchAllProposals } from "@/lib/actions/proposals";
import { Search, Globe, Activity, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function DashboardExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery = "" } = await searchParams;
  const result = await fetchAllProposals();
  
  const proposals = result.success && result.proposals ? result.proposals : [];

  // Platform-wide metrics for the explorer
  const activeNodes = proposals.reduce((acc, p) => acc + (p.voter_count || 0), 0);
  const totalPledged = proposals.reduce((acc, p) => acc + (p.budget_amount || 0), 0);

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
          <form action="/dashboard/explore" className="relative group w-full max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              name="q"
              defaultValue={searchQuery}
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
        />
      </div>
    </div>
  );
}
