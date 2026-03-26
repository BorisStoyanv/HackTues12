"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalVoteView } from "@/components/proposals/proposal-vote-view";
import { fetchProposalById, SerializedProposal } from "@/lib/actions/proposals";
import { useEffect, useState } from "react";

export default function DashboardVotePage() {
  const { id } = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(undefined);

  useEffect(() => {
    if (typeof id === "string") {
      fetchProposalById(id).then(res => {
        if (res.success) setProposal(res.proposal);
      });
    }
  }, [id]);

  if (typeof id !== "string") return null;

  return (
    <div className="h-full overflow-auto">
      <ProposalVoteView 
        id={id} 
        mode="authenticated" 
        initialData={proposal}
        onBack={() => router.push(`/dashboard/proposals/${id}`)} 
      />
    </div>
  );
}
