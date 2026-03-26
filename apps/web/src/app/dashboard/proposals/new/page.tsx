"use client";

import { ProposalWizard } from "@/components/proposals/proposal-wizard";

export default function NewProposalPage() {
  return (
    <div className="h-full overflow-auto bg-neutral-50/50 dark:bg-neutral-950/50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Proposal</h1>
        <p className="text-muted-foreground text-lg">
          Submit your Data Pack for AI evaluation and community funding. Ensure all details are strictly factual.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <ProposalWizard />
      </div>
    </div>
  );
}
