"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalView } from "@/components/proposals/proposal-view";

export default function DashboardProposalDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  if (typeof id !== "string") return null;

  return (
    <div className="h-full overflow-auto">
      <ProposalView 
        id={id} 
        mode="authenticated" 
        onBack={() => router.push("/dashboard/explore")} 
      />
    </div>
  );
}
