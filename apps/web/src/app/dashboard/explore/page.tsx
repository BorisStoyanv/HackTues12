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
    <div className="flex h-full flex-col overflow-hidden">
      <ProposalExplorer 
        mode="authenticated" 
        proposals={proposals} 
        searchQuery={searchQuery}
      />
    </div>
  );
}
