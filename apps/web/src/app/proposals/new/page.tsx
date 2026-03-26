"use client";

import { ProposalWizard } from "@/components/proposals/proposal-wizard";
import { Landmark } from "lucide-react";
import Link from "next/link";

export default function NewProposalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">OpenFairTrip</span>
          </Link>
          <div className="text-sm font-medium text-muted-foreground">
            Proposal Submission Portal
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Proposal</h1>
          <p className="text-muted-foreground">
            Submit your Data Pack for AI evaluation and community funding. Ensure all details are strictly factual.
          </p>
        </div>

        <ProposalWizard />
      </main>
    </div>
  );
}
