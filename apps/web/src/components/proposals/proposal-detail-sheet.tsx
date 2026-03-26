"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SerializedProposal } from "@/lib/actions/proposals";
import { ProposalView } from "./proposal-view";

interface ProposalDetailSheetProps {
	proposal: SerializedProposal | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	mode?: "public" | "authenticated";
}

export function ProposalDetailSheet({
	proposal,
	isOpen,
	onOpenChange,
	mode = "public",
}: ProposalDetailSheetProps) {
	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="min-w-6xl sm:max-w-6xl p-0 border-l-neutral-200 dark:border-l-neutral-800 flex flex-col"
			>
				<div className="h-full overflow-hidden flex flex-col">
					{proposal ? (
						<ProposalView
							id={proposal.id}
							mode={mode}
							initialData={proposal}
						/>
					) : (
						<div className="flex-1 flex items-center justify-center p-12 text-center text-muted-foreground italic">
							Loading protocol data pack...
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
