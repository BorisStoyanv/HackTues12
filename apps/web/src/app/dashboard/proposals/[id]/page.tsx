import { fetchProposalById, fetchProposalVotes } from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/proposal-view";

export default async function DashboardProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proposalResult, votesResult] = await Promise.all([
    fetchProposalById(id),
    fetchProposalVotes(id),
  ]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <ProposalView
        id={id}
        mode="authenticated"
        initialData={
          proposalResult.success ? proposalResult.proposal : undefined
        }
        votes={votesResult.success ? votesResult.votes : []}
      />
    </div>
  );
}
