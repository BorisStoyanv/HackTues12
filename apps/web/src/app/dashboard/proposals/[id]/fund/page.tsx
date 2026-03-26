"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalFundView } from "@/components/proposals/proposal-fund-view";
import { useEffect, useState } from "react";
import { fetchProposalById, SerializedProposal } from "@/lib/actions/proposals";

export default function DashboardFundPage() {
  const { id } = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof id === "string") {
      fetchProposalById(id).then(res => {
        if (res.success) setProposal(res.proposal);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (typeof id !== "string") return null;

  return (
    <div className="h-full overflow-auto">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProposalFundView 
          id={id} 
          mode="authenticated" 
          initialData={proposal}
          onBack={() => router.push(`/dashboard/proposals/${id}`)} 
        />
      )}
    </div>
  );
}
