import { fetchProposalById } from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/proposal-view";

export default async function PublicProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchProposalById(id);

  return (
    <ProposalView 
      id={id} 
      mode="public" 
      initialData={result.proposal}
    />
  );
}
