import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { fetchAllProposals } from "@/lib/actions/proposals";

export default async function DashboardExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery = "" } = await searchParams;
  const result = await fetchAllProposals();
  
  const proposals = result.success && result.proposals ? result.proposals : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Dynamic Header Section */}
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-10 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
               <h1 className="text-2xl font-bold tracking-tight text-foreground">
                 Interactive Explorer
               </h1>
            </div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
              Live Geographic Governance Ledger
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="h-10 px-4 bg-background border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Real-time Sync</span>
             </div>
          </div>
        </div>
      </div>

      {/* Explorer Component - Fills remaining space */}
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
