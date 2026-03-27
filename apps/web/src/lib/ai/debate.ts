"use client";

import { SerializedProposal } from "@/lib/actions/proposals";
import { AI_WORKER_URL } from "@/lib/env";
import { SaveProposalAIDebateInput } from "@/lib/types/api";

type DebateRequestProposal = Pick<
  SerializedProposal,
  | "title"
  | "description"
  | "category"
  | "budget_amount"
  | "budget_currency"
  | "region_tag"
  | "location"
> &
  Partial<
    Pick<
      SerializedProposal,
      | "short_description"
      | "problem_statement"
      | "budget_breakdown"
      | "executor_name"
      | "execution_plan"
      | "timeline"
      | "expected_impact"
      | "risk_flags"
    >
  >;

const MAX_DEBATE_INFO_LENGTH = 5000;
const TRUNCATION_SUFFIX = "...";

function asFiniteScore(value: unknown, field: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`AI worker returned an invalid ${field}.`);
  }

  return Math.min(1, Math.max(0, numeric));
}

function asText(value: unknown, field: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`AI worker returned an empty ${field}.`);
  }

  return text;
}

function normalizeDebateInfoValue(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function truncateDebateInfo(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  const cutoff = Math.max(0, maxLength - TRUNCATION_SUFFIX.length);
  return `${text.slice(0, cutoff).trimEnd()}${TRUNCATION_SUFFIX}`;
}

function buildProposalDebateInfo(proposal: DebateRequestProposal) {
  const riskFlags = Array.isArray(proposal.risk_flags)
    ? proposal.risk_flags.join(", ")
    : "";
  const sections = [
    ["Summary", proposal.short_description],
    ["Description", proposal.description],
    ["Problem statement", proposal.problem_statement],
    ["Expected impact", proposal.expected_impact],
    ["Execution plan", proposal.execution_plan],
    ["Timeline", proposal.timeline],
    ["Budget breakdown", proposal.budget_breakdown],
    ["Executor", proposal.executor_name],
    ["Risk flags", riskFlags],
  ]
    .map(([label, value]) => {
      const text = normalizeDebateInfoValue(value);
      return text ? `${label}: ${text}` : null;
    })
    .filter((section): section is string => Boolean(section));

  return truncateDebateInfo(
    sections.join("\n\n"),
    MAX_DEBATE_INFO_LENGTH,
  );
}

export function buildProposalDebateRequest(proposal: DebateRequestProposal) {
  return {
    proposal: {
      name: proposal.title,
      location:
        proposal.location.formatted_address ||
        proposal.location.city ||
        proposal.region_tag,
      category: proposal.category,
      info: buildProposalDebateInfo(proposal),
      neededFunds: proposal.budget_amount,
      currency: proposal.budget_currency,
    },
  };
}

export function normalizeProposalAIDebateResult(
  payload: any,
): SaveProposalAIDebateInput {
  const result = payload?.result ?? payload?.data ?? payload;
  const final = result?.final;
  const criteria = final?.criteriaRatings ?? final?.criteria_ratings;
  const rounds = Array.isArray(result?.rounds) ? result.rounds : [];
  const evidence =
    result?.internetEvidence ?? result?.internet_evidence ?? {};
  const geoHint = evidence?.geoHint ?? evidence?.geo_hint ?? null;

  if (!result || !final || rounds.length === 0 || !criteria) {
    throw new Error("AI worker returned an incomplete debate result.");
  }

  return {
    models: {
      advocate: asText(result?.models?.advocate, "models.advocate"),
      skeptic: asText(result?.models?.skeptic, "models.skeptic"),
      judge: asText(result?.models?.judge, "models.judge"),
    },
    search_text: asText(
      evidence?.searchText ?? evidence?.search_text ?? result?.proposal?.name,
      "search_text",
    ),
    geo_hint_display_name: geoHint?.displayName
      ? [String(geoHint.displayName)]
      : geoHint?.display_name
        ? [String(geoHint.display_name)]
        : [],
    rounds: rounds.map((round: any, index: number) => ({
      round: Number(round?.round ?? index + 1),
      advocate_statement: asText(
        round?.advocateStatement ?? round?.advocate_statement,
        `round ${index + 1} advocate statement`,
      ),
      skeptic_statement: asText(
        round?.skepticStatement ?? round?.skeptic_statement,
        `round ${index + 1} skeptic statement`,
      ),
      winner: asText(round?.winner, `round ${index + 1} winner`).toLowerCase(),
      score: asFiniteScore(round?.score, `round ${index + 1} score`),
      rationale: asText(round?.rationale, `round ${index + 1} rationale`),
    })),
    aggregate_score: asFiniteScore(
      final?.aggregateScore ?? final?.aggregate_score,
      "aggregate score",
    ),
    judge_reported_aggregate_score: asFiniteScore(
      final?.judgeReportedAggregateScore ?? final?.judge_reported_aggregate_score,
      "judge aggregate score",
    ),
    funding_priority_score: asFiniteScore(
      final?.fundingPriorityScore ?? final?.funding_priority_score,
      "funding priority score",
    ),
    funding_recommendation: asText(
      final?.fundingRecommendation ?? final?.funding_recommendation,
      "funding recommendation",
    ).toLowerCase(),
    rationale: asText(final?.rationale, "final rationale"),
    criteria_ratings: {
      popularity: asFiniteScore(criteria?.popularity, "criteria popularity"),
      tourism_attendance: asFiniteScore(
        criteria?.tourismAttendance ?? criteria?.tourism_attendance,
        "criteria tourism attendance",
      ),
      neglect_and_age: asFiniteScore(
        criteria?.neglectAndAge ?? criteria?.neglect_and_age,
        "criteria neglect and age",
      ),
      potential_tourism_benefit: asFiniteScore(
        criteria?.potentialTourismBenefit ??
          criteria?.potential_tourism_benefit,
        "criteria potential tourism benefit",
      ),
    },
  };
}

export async function runProposalDebateEvaluation(
  proposal: DebateRequestProposal,
) {
  const response = await fetch(`${AI_WORKER_URL}/api/v1/debate/proposals/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildProposalDebateRequest(proposal)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `AI debate failed (${response.status}): ${text || response.statusText}`,
    );
  }

  const payload = await response.json();
  return normalizeProposalAIDebateResult(payload);
}
