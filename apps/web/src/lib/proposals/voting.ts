import { SerializedProposal } from "../actions/proposals";

export interface ProposalVotingMetrics {
  yesWeight: number;
  noWeight: number;
  totalCastWeight: number;
  totalRegionalVp: number;
  supportPercent: number;
  oppositionPercent: number;
  turnoutPercent: number;
  leadingPercentOfRegion: number;
  supportShareOfCastPercent: number;
  hasVotes: boolean;
}

export const QUORUM_PERCENT_OF_TOTAL = 5;
export const ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL = 51;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

export function getProposalVotingMetrics(
  proposal: Pick<
    SerializedProposal,
    "yes_weight" | "no_weight" | "total_regional_vp"
  >,
): ProposalVotingMetrics {
  const yesWeight = proposal.yes_weight ?? 0;
  const noWeight = proposal.no_weight ?? 0;
  const totalCastWeight = yesWeight + noWeight;
  const totalRegionalVp = proposal.total_regional_vp ?? 0;
  const leadingWeight = Math.max(yesWeight, noWeight);

  return {
    yesWeight,
    noWeight,
    totalCastWeight,
    totalRegionalVp,
    supportPercent:
      totalRegionalVp > 0
        ? clampPercent((yesWeight / totalRegionalVp) * 100)
        : 0,
    oppositionPercent:
      totalRegionalVp > 0
        ? clampPercent((noWeight / totalRegionalVp) * 100)
        : 0,
    turnoutPercent:
      totalRegionalVp > 0
        ? clampPercent((totalCastWeight / totalRegionalVp) * 100)
        : 0,
    leadingPercentOfRegion:
      totalRegionalVp > 0 ? (leadingWeight / totalRegionalVp) * 100 : 0,
    supportShareOfCastPercent:
      totalCastWeight > 0 ? (yesWeight / totalCastWeight) * 100 : 0,
    hasVotes: totalCastWeight > 0,
  };
}

export function isProposalClosable(
  proposal: Pick<
    SerializedProposal,
    | "status"
    | "voting_ends_at"
    | "yes_weight"
    | "no_weight"
    | "total_regional_vp"
  >,
  nowMs: number = Date.now(),
): boolean {
  if (proposal.status !== "Active") {
    return false;
  }

  const metrics = getProposalVotingMetrics(proposal);
  return (
    nowMs >= proposal.voting_ends_at / 1_000_000 ||
    metrics.leadingPercentOfRegion >= ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL
  );
}

export function formatPercent(
  value: number,
  fractionDigits: number = 0,
): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safeValue.toFixed(fractionDigits)}%`;
}

export function formatConfigPercent(
  value: number,
  fractionDigits: number = 0,
): string {
  return formatPercent(value * 100, fractionDigits);
}
