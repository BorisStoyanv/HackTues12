import { z } from "zod";
import { callOpenRouter } from "./openrouter.js";
import { collectInternetEvidence } from "./internetResearch.js";
import { clamp, extractJsonObject } from "./jsonUtils.js";

const MODELS = {
  advocate: "google/gemini-2.5-flash-lite",
  skeptic: "anthropic/claude-haiku-4.5",
  judge: "openai/gpt-5-nano",
};

const ROUND_COUNT = 3;
export const DEBATE_MODELS = MODELS;
export const DEBATE_ROUND_COUNT = ROUND_COUNT;

function formatProposal(proposal) {
  const lines = [
    `Name: ${proposal.name}`,
    `Category: ${proposal.category}`,
    `Location: ${proposal.location}`,
    `Needed funds: ${proposal.neededFunds} ${proposal.currency || "USD"}`,
  ];

  if (proposal.info) {
    lines.push(`Info: ${proposal.info}`);
  }

  return lines.join("\n");
}

function formatEvidence(evidence) {
  const sourceLines = evidence.sources.length
    ? evidence.sources
        .map((source, index) => {
          const summary = source.summary ? source.summary.slice(0, 400) : "No summary available.";
          const pageviews = source.avgDailyPageviews30d === null ? "unknown" : String(source.avgDailyPageviews30d);
          return [
            `${index + 1}. ${source.title}`,
            `   URL: ${source.url}`,
            `   Snippet: ${source.snippet || "n/a"}`,
            `   Avg daily pageviews (30d): ${pageviews}`,
            `   Summary: ${summary}`,
          ].join("\n");
        })
        .join("\n")
    : "No reliable external sources found.";

  return [
    `Search text: ${evidence.searchText}`,
    `Geo hint: ${
      evidence.geoHint
        ? `${evidence.geoHint.displayName} (lat ${evidence.geoHint.lat}, lon ${evidence.geoHint.lon})`
        : "unavailable"
    }`,
    "Sources:",
    sourceLines,
  ].join("\n");
}

function formatHistory(rounds) {
  if (!rounds.length) {
    return "No previous rounds.";
  }

  return rounds
    .map((round) => {
      return [
        `Round ${round.round}:`,
        `Advocate: ${round.advocateStatement}`,
        `Skeptic: ${round.skepticStatement}`,
        `Judge winner: ${round.winner}, score: ${round.score}`,
        `Judge rationale: ${round.rationale}`,
      ].join("\n");
    })
    .join("\n\n");
}

function normalizeScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid numeric score: ${value}`);
  }

  return Number(clamp(numeric, 0, 1).toFixed(3));
}

async function callModelForJson({
  model,
  systemPrompt,
  userPrompt,
  maxTokens = 700,
  temperature = 0.2,
  includeReasoning,
  reasoning,
}) {
  let finalPrompt = userPrompt;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const responseText = await callOpenRouter({
        model,
        systemPrompt,
        userPrompt: finalPrompt,
        temperature,
        maxTokens,
        includeReasoning,
        reasoning,
      });

      return extractJsonObject(responseText);
    } catch (error) {
      if (attempt === 2) {
        throw new Error(`Failed to parse JSON from model output: ${error.message}`);
      }

      finalPrompt = `${userPrompt}\n\nIMPORTANT: return only valid JSON. No markdown, no prose.`;
    }
  }

  throw new Error("Unreachable JSON parse path");
}

async function generateAdvocateStatement({ proposalText, evidenceText, historyText, round }) {
  const systemPrompt = [
    "You are the ADVOCATE in a public-funding debate.",
    "Your goal is to argue for funding the proposal.",
    "Use concrete facts from proposal details, internet evidence, and prior debate context.",
    "Respond with one concise statement only (max 140 words, no bullets).",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Previous rounds:",
    historyText,
    "",
    "Write exactly one strong statement supporting funding.",
  ].join("\n");

  return callOpenRouter({
    model: MODELS.advocate,
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 220,
  });
}

async function generateSkepticStatement({ proposalText, evidenceText, historyText, round }) {
  const systemPrompt = [
    "You are the SKEPTIC in a public-funding debate.",
    "Your goal is to argue against funding the proposal.",
    "Use concrete concerns from proposal details, internet evidence, and prior debate context.",
    "Respond with one concise statement only (max 140 words, no bullets).",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Previous rounds:",
    historyText,
    "",
    "Write exactly one strong statement opposing funding.",
  ].join("\n");

  return callOpenRouter({
    model: MODELS.skeptic,
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 220,
  });
}

const roundJudgmentSchema = z.object({
  winner: z.enum(["advocate", "skeptic", "tie"]),
  score: z.union([z.number(), z.string()]),
  rationale: z.string().min(1),
});

async function judgeRound({ proposalText, evidenceText, historyText, round, advocateStatement, skepticStatement }) {
  const systemPrompt = [
    "You are the neutral JUDGE in a funding debate.",
    "Evaluate only argument quality and evidence use.",
    "Scoring rule: 0.5 is neutral/tie, >0.5 means advocate stronger, <0.5 means skeptic stronger.",
    "Return JSON only.",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Debate history:",
    historyText,
    "",
    `Advocate statement: ${advocateStatement}`,
    `Skeptic statement: ${skepticStatement}`,
    "",
    "Return exactly this JSON schema:",
    '{"winner":"advocate|skeptic|tie","score":0.5,"rationale":"short explanation"}',
  ].join("\n");

  const parsed = roundJudgmentSchema.parse(
    await callModelForJson({
      model: MODELS.judge,
      systemPrompt,
      userPrompt,
      maxTokens: 1600,
      temperature: undefined,
      includeReasoning: false,
      reasoning: { effort: "low" },
    })
  );

  const score = normalizeScore(parsed.score);

  return {
    winner: parsed.winner,
    score,
    rationale: parsed.rationale.trim(),
  };
}

const finalJudgmentSchema = z.object({
  aggregate_score: z.union([z.number(), z.string()]),
  criteria_ratings: z.object({
    popularity: z.union([z.number(), z.string()]),
    tourism_attendance: z.union([z.number(), z.string()]),
    neglect_and_age: z.union([z.number(), z.string()]),
    potential_tourism_benefit: z.union([z.number(), z.string()]),
  }),
  rationale: z.string().min(1),
  funding_recommendation: z.string().optional(),
});

function computeFundingPriority(criteriaRatings) {
  const popularity = normalizeScore(criteriaRatings.popularity);
  const tourismAttendance = normalizeScore(criteriaRatings.tourism_attendance);
  const neglectAndAge = normalizeScore(criteriaRatings.neglect_and_age);
  const tourismBenefit = normalizeScore(criteriaRatings.potential_tourism_benefit);

  const weighted =
    (1 - popularity) * 0.25 +
    (1 - tourismAttendance) * 0.25 +
    neglectAndAge * 0.25 +
    tourismBenefit * 0.25;

  return {
    normalizedCriteria: {
      popularity,
      tourism_attendance: tourismAttendance,
      neglect_and_age: neglectAndAge,
      potential_tourism_benefit: tourismBenefit,
    },
    fundingPriorityScore: Number(clamp(weighted, 0, 1).toFixed(3)),
  };
}

async function judgeFinal({ proposalText, evidenceText, rounds }) {
  const roundsText = rounds
    .map((round) => {
      return [
        `Round ${round.round}:`,
        `Advocate: ${round.advocateStatement}`,
        `Skeptic: ${round.skepticStatement}`,
        `Judge winner: ${round.winner}`,
        `Judge score: ${round.score}`,
        `Judge rationale: ${round.rationale}`,
      ].join("\n");
    })
    .join("\n\n");

  const systemPrompt = [
    "You are the neutral final JUDGE.",
    "Use internet evidence and full debate history to provide final scoring criteria.",
    "Criteria rating scale is 0..1 where higher means more of that metric itself.",
    "For popularity and tourism_attendance, high values imply lower funding priority.",
    "For neglect_and_age and potential_tourism_benefit, high values imply higher funding priority.",
    "Return JSON only.",
  ].join(" ");

  const userPrompt = [
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Three rounds summary:",
    roundsText,
    "",
    "Return exactly this JSON schema:",
    '{"aggregate_score":0.5,"criteria_ratings":{"popularity":0.3,"tourism_attendance":0.4,"neglect_and_age":0.7,"potential_tourism_benefit":0.8},"rationale":"short explanation","funding_recommendation":"fund|defer|reject"}',
  ].join("\n");

  return finalJudgmentSchema.parse(
    await callModelForJson({
      model: MODELS.judge,
      systemPrompt,
      userPrompt,
      maxTokens: 3000,
      temperature: undefined,
      includeReasoning: false,
      reasoning: { effort: "low" },
    })
  );
}

function cleanStatement(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeFundingRecommendation(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "fund" || normalized === "defer" || normalized === "reject") {
    return normalized;
  }

  return "defer";
}

export async function runProposalDebate(proposal, hooks = {}) {
  const onProgress =
    typeof hooks.onProgress === "function"
      ? hooks.onProgress
      : async () => {};
  const shouldContinue =
    typeof hooks.shouldContinue === "function"
      ? hooks.shouldContinue
      : () => true;

  const ensureContinue = () => {
    if (!shouldContinue()) {
      throw new Error("Debate run interrupted: client disconnected");
    }
  };

  await onProgress({
    type: "debate_started",
    models: MODELS,
    roundCount: ROUND_COUNT,
    proposal,
  });

  ensureContinue();
  const proposalText = formatProposal(proposal);
  const evidence = await collectInternetEvidence(proposal);
  const evidenceText = formatEvidence(evidence);
  await onProgress({
    type: "internet_evidence",
    internetEvidence: evidence,
  });
  ensureContinue();

  const rounds = [];

  for (let round = 1; round <= ROUND_COUNT; round += 1) {
    await onProgress({
      type: "round_started",
      round,
    });
    ensureContinue();

    const historyText = formatHistory(rounds);

    const [advocateRaw, skepticRaw] = await Promise.all([
      generateAdvocateStatement({
        proposalText,
        evidenceText,
        historyText,
        round,
      }),
      generateSkepticStatement({
        proposalText,
        evidenceText,
        historyText,
        round,
      }),
    ]);

    const advocateStatement = cleanStatement(advocateRaw);
    const skepticStatement = cleanStatement(skepticRaw);
    await onProgress({
      type: "round_statements",
      round,
      advocateStatement,
      skepticStatement,
    });
    ensureContinue();

    const judgment = await judgeRound({
      proposalText,
      evidenceText,
      historyText,
      round,
      advocateStatement,
      skepticStatement,
    });

    rounds.push({
      round,
      advocateStatement,
      skepticStatement,
      winner: judgment.winner,
      score: judgment.score,
      rationale: judgment.rationale,
    });

    await onProgress({
      type: "round_completed",
      ...rounds[rounds.length - 1],
    });
    ensureContinue();
  }

  const calculatedAggregateScore = Number(
    (rounds.reduce((sum, item) => sum + item.score, 0) / ROUND_COUNT).toFixed(3)
  );

  const finalJudgeResult = await judgeFinal({
    proposalText,
    evidenceText,
    rounds,
  });

  const judgeReportedAggregateScore = normalizeScore(finalJudgeResult.aggregate_score);
  const finalAggregateScore = calculatedAggregateScore;

  const { normalizedCriteria, fundingPriorityScore } = computeFundingPriority(
    finalJudgeResult.criteria_ratings
  );

  const result = {
    models: MODELS,
    proposal,
    internetEvidence: evidence,
    rounds,
    final: {
      aggregateScore: finalAggregateScore,
      judgeReportedAggregateScore,
      criteriaRatings: normalizedCriteria,
      fundingPriorityScore,
      fundingRecommendation: normalizeFundingRecommendation(
        finalJudgeResult.funding_recommendation
      ),
      rationale: finalJudgeResult.rationale.trim(),
    },
  };

  await onProgress({
    type: "debate_completed",
    result,
  });

  return result;
}
