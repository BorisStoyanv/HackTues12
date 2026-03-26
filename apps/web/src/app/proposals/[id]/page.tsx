"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalView } from "@/components/proposals/proposal-view";

export default function PublicProposalDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  if (typeof id !== "string") return null;

  return (
    <ProposalView 
      id={id} 
      mode="public" 
      onBack={() => router.push("/explore")} 
    />
  );
}
