"use client";

import { useParams, useRouter } from "next/navigation";
import VotePage from "@/app/proposals/[id]/vote/page";

export default function DashboardVotePage() {
  const { id } = useParams();
  const router = useRouter();

  if (typeof id !== "string") return null;

  // We can wrap the existing VotePage or create a shared component.
  // For now, since the existing VotePage is already "use client" and standalone,
  // we can either redirect or import its content.
  // Actually, VotePage has its own header. I should make it a shared component if I want it nested perfectly.
  
  return <VotePage />;
}
