"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  HandCoins, 
  DollarSign,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SerializedProposal } from "@/lib/actions/proposals";
import { useProposalGovernance } from "@/hooks/use-proposal-governance";
import { cn } from "@/lib/utils";
import { backProposalClient } from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";

interface ProposalActionCardProps {
  proposal: SerializedProposal;
}

export function ProposalActionCard({ proposal }: ProposalActionCardProps) {
  const { identity, user } = useAuthStore();
  const {
    handleVote,
    isSubmittingVote,
    viewerVote,
    voteDisabledReason,
    voteError,
  } = useProposalGovernance(proposal);

  const [pledgeAmount, setPledgeAmount] = useState<string>("");
  const [isFunding, setIsFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSuccess, setFundSuccess] = useState(false);

  const handleFund = async () => {
    if (!identity) return;
    setIsFunding(true);
    setFundError(null);
    try {
      await backProposalClient(identity, proposal.id);
      setFundSuccess(true);
    } catch (err: any) {
      setFundError(err.message || "Funding failed");
    } finally {
      setIsFunding(false);
    }
  };

  if (proposal.status === "Active") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black uppercase tracking-widest">Cast Your Stance</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Your signature is immutably pinned to this consensus round.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            disabled={!!voteDisabledReason || isSubmittingVote}
            onClick={() => handleVote(true)}
            className={cn(
              "h-14 rounded-2xl border-2 transition-all duration-300",
              viewerVote?.inFavor 
                ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                : "bg-background border-neutral-100 dark:border-neutral-800 text-foreground hover:border-emerald-500/50 hover:bg-emerald-50/50"
            )}
          >
            {isSubmittingVote ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            <span className="font-black uppercase tracking-widest text-xs">Approve</span>
          </Button>
          <Button
            disabled={!!voteDisabledReason || isSubmittingVote}
            onClick={() => handleVote(false)}
            className={cn(
              "h-14 rounded-2xl border-2 transition-all duration-300",
              viewerVote && !viewerVote.inFavor
                ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "bg-background border-neutral-100 dark:border-neutral-800 text-foreground hover:border-rose-500/50 hover:bg-rose-50/50"
            )}
          >
            {isSubmittingVote ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
            <span className="font-black uppercase tracking-widest text-xs">Reject</span>
          </Button>
        </div>
        
        {voteDisabledReason && !viewerVote && (
          <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-tight">{voteDisabledReason}</p>
        )}
        {voteError && (
          <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-tight">{voteError}</p>
        )}
      </div>
    );
  }

  if (proposal.status === "AwaitingFunding") {
    const isInvestor = user?.role === "InvestorUser" || user?.role === "funder";
    
    if (fundSuccess) {
      return (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 space-y-2 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto" />
          <p className="font-black uppercase tracking-widest text-sm">Capital Deployed</p>
          <p className="text-xs font-medium">Your contribution is now locked in escrow.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black uppercase tracking-widest">Deploy Capital</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Verified investor path only. Escrow-protected.</p>
        </div>

        {!isInvestor ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-tight leading-normal">
              Only verified Capital Providers can fund this project. Upgrade your profile in settings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="number" 
                placeholder="Amount to pledge..." 
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value)}
                className="h-14 pl-10 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-bold"
              />
            </div>
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              disabled={isFunding || !pledgeAmount || parseFloat(pledgeAmount) <= 0}
              onClick={handleFund}
            >
              {isFunding ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
              Sign & Deploy
            </Button>
            {fundError && <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-tight">{fundError}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center">
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        {proposal.status === "Backed" ? "Project Fully Backed" : `Status: ${proposal.status}`}
      </p>
    </div>
  );
}
