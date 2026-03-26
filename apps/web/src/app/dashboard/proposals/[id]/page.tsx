import { fetchProposalById } from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/proposal-view";
import { notFound } from "next/navigation";

export default async function DashboardProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchProposalById(id);

  // If the result is explicitly failed, we still pass undefined to initialData
  // and the ProposalView will render its own "Not Found" state which is more
  // graceful for the dashboard context than a hard next/navigation notFound()
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <ProposalView 
        id={id} 
        mode="authenticated" 
        initialData={result.success ? result.proposal : undefined}
      />
    </div>
  );
}
