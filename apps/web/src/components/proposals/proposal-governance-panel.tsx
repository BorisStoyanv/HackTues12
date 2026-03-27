"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Vote,
  XCircle,
} from "lucide-react";

import { useProposalGovernance } from "@/hooks/use-proposal-governance";
import { SerializedProposal } from "@/lib/actions/proposals";
import {
  formatPercent,
  getProposalVotingMetrics,
} from "@/lib/proposals/voting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface ProposalGovernancePanelProps {
  id: string;
  mode: "public" | "authenticated";
  proposal: SerializedProposal;
}

export function ProposalGovernancePanel({
  id,
  mode,
  proposal,
}: ProposalGovernancePanelProps) {
  const metrics = getProposalVotingMetrics(proposal);
  const {
    canCloseProposal,
    closeError,
    handleCloseProposal,
    handleVote,
    isClosingProposal,
    isLoading,
    isLocallyVerified,
    isSubmittingVote,
    viewerProfile,
    viewerVote,
    viewerVotingPower,
    voteDisabledReason,
    voteError,
  } = useProposalGovernance(proposal);

  const statusFormatted = proposal.status.replace(/([A-Z])/g, " $1").trim();
  const voteRoutePrefix =
    mode === "authenticated" ? "/dashboard/proposals" : "/proposals";
  const voteButtonsDisabled = Boolean(voteDisabledReason) || isSubmittingVote;
  const hasRecordedVote = Boolean(viewerVote);
  const closeHelperText =
    proposal.status !== "Active"
      ? null
      : canCloseProposal
        ? "Voting can be closed now. Automatic resolution also runs when the threshold or deadline is reached."
        : "Voting closes automatically at 51% of all possible regional VP or when the voting window expires.";

  return (
    <Card className="border-border shadow-sm rounded-xl overflow-hidden sticky top-24 bg-background">
      <CardHeader className="p-6 pb-4 border-b border-border">
        <CardTitle className="text-lg font-medium tracking-tight">
          Governance Status
        </CardTitle>
        <CardDescription className="text-sm font-medium mt-1">
          {statusFormatted}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground mb-1">
                Support
              </span>
              <span className="font-semibold text-2xl tracking-tight">
                {formatPercent(metrics.supportPercent, 1)}
              </span>
            </div>
            <span className="text-primary font-medium text-sm mb-1">
              {metrics.hasVotes
                ? `${metrics.yesWeight.toFixed(1)} yes VP`
                : "No votes yet"}
            </span>
          </div>
          <Progress value={metrics.supportPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Turnout</p>
            <p className="text-base font-semibold tracking-tight">
              {formatPercent(metrics.turnoutPercent, 1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.totalCastWeight.toFixed(1)} /{" "}
              {metrics.totalRegionalVp.toFixed(1)} VP
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Yes / No
            </p>
            <p className="text-base font-semibold tracking-tight">
              {metrics.yesWeight.toFixed(1)} / {metrics.noWeight.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {proposal.voter_count} voters
            </p>
          </div>
        </div>

        {proposal.status === "Active" && (
          <>
            <Separator className="bg-border" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cast your vote</p>
                  <p className="text-xs text-muted-foreground">
                    One click submits directly to the canister.
                  </p>
                </div>
                {hasRecordedVote && (
                  <Badge variant="outline" className="font-medium">
                    {viewerVote?.inFavor ? "Voted Yes" : "Voted No"}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  disabled={voteButtonsDisabled}
                  onClick={() => handleVote(true)}
                  className={cn(
                    "h-12 justify-start rounded-xl border",
                    viewerVote?.inFavor
                      ? "bg-emerald-600 text-white hover:bg-emerald-600"
                      : "bg-background text-foreground hover:bg-emerald-500/10",
                  )}
                >
                  {isSubmittingVote ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Yes
                </Button>
                <Button
                  type="button"
                  disabled={voteButtonsDisabled}
                  onClick={() => handleVote(false)}
                  className={cn(
                    "h-12 justify-start rounded-xl border",
                    viewerVote && !viewerVote.inFavor
                      ? "bg-red-600 text-white hover:bg-red-600"
                      : "bg-background text-foreground hover:bg-red-500/10",
                  )}
                >
                  {isSubmittingVote ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  No
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Your voting power
                  </span>
                  <span className="font-semibold">
                    {viewerVotingPower !== null
                      ? `${viewerVotingPower.toFixed(1)} VP`
                      : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Eligibility</span>
                  <span className="font-semibold">
                    {isLoading
                      ? "Checking"
                      : viewerProfile
                        ? viewerProfile.userType === "User"
                          ? "Community voter"
                          : "Investor account"
                        : "No profile"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Region weighting
                  </span>
                  <span className="font-semibold">
                    {viewerProfile
                      ? isLocallyVerified
                        ? "Local verified"
                        : viewerProfile.homeRegion
                          ? "External to region"
                          : "No home region"
                      : "Unavailable"}
                  </span>
                </div>
              </div>

              {voteDisabledReason && (
                <p className="text-sm text-muted-foreground">
                  {voteDisabledReason}
                </p>
              )}
              {voteError && (
                <p className="text-sm text-destructive">{voteError}</p>
              )}
            </div>
          </>
        )}

        <Separator className="bg-border" />

        <div className="space-y-3">
          {proposal.status === "Active" && (
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium"
              disabled={!canCloseProposal || isClosingProposal}
              onClick={handleCloseProposal}
            >
              {isClosingProposal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing vote
                </>
              ) : (
                <>
                  <Vote className="mr-2 h-4 w-4" />
                  Close voting
                </>
              )}
            </Button>
          )}
          {proposal.status === "AwaitingFunding" && (
            <Link
              href={`${voteRoutePrefix}/${id}/fund`}
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "w-full font-medium bg-green-600 hover:bg-green-700 text-white",
              )}
            >
              Back project
            </Link>
          )}
          <Button variant="outline" className="w-full font-medium">
            Export Audit
          </Button>
        </div>

        {closeHelperText && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Resolution rules
            </div>
            <p>{closeHelperText}</p>
            {closeError && <p className="text-destructive">{closeError}</p>}
          </div>
        )}

        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Constraints
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {proposal.risk_flags.length > 0 ? (
              proposal.risk_flags.map((flag: string) => (
                <Badge
                  key={flag}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {flag}
                </Badge>
              ))
            ) : (
              <Badge
                variant="secondary"
                className="text-xs font-normal bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
              >
                Clean Profile
              </Badge>
            )}
          </div>
        </div>

        {proposal.status === "Active" && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Voting snapshot
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Opposition</span>
              <span>{formatPercent(metrics.oppositionPercent, 1)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Absolute threshold</span>
              <span>
                {formatPercent(metrics.leadingPercentOfRegion, 1)} of region VP
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
