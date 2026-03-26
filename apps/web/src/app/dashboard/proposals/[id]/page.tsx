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

  if (!result.success || !result.proposal) {
    // If not found in backend, let the ProposalView handle mock fallback or show 404
    // But for a better UX, we'll pass it if we have it
  }

  return (
    <div className="h-full overflow-auto">
      <ProposalView 
        id={id} 
        mode="authenticated" 
        initialData={result.proposal}
      />
    </div>
  );
}
