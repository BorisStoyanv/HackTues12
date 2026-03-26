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
const REPETITION_SIMILARITY_THRESHOLD = 0.68;
const MAX_CARRYOVER_ITEMS = 6;
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

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function looksConcreteClaim(sentence) {
  return /\d|€|\$|%|pageview|visitor|fund|budget|roi|cost|year|daily|million/i.test(sentence);
}

function extractConcreteClaims(rounds) {
  const claims = [];

  for (const round of rounds) {
    for (const [speaker, statement] of [
      ["advocate", round.advocateStatement],
      ["skeptic", round.skepticStatement],
    ]) {
      const sentences = splitSentences(statement);
      const concrete = sentences.find(looksConcreteClaim) || sentences[0];

      if (concrete) {
        claims.push(`Round ${round.round} ${speaker}: ${concrete}`);
      }
    }
  }

  return claims.slice(-MAX_CARRYOVER_ITEMS);
}

function extractUnresolvedJudgePoints(rounds) {
  return rounds
    .slice(-MAX_CARRYOVER_ITEMS)
    .map((round) => `Round ${round.round}: ${round.rationale}`);
}

function formatNumberedList(items, fallback) {
  if (!items.length) {
    return fallback;
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function normalizeSimilarityTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function jaccardSimilarity(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) {
    return 0;
  }

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let overlap = 0;

  for (const token of aSet) {
    if (bSet.has(token)) {
      overlap += 1;
    }
  }

  const union = aSet.size + bSet.size - overlap;
  if (!union) {
    return 0;
  }

  return overlap / union;
}

function maxSimilarityWithHistory(statement, previousStatements) {
  const candidateTokens = normalizeSimilarityTokens(statement);

  return previousStatements.reduce((max, previous) => {
    const similarity = jaccardSimilarity(candidateTokens, normalizeSimilarityTokens(previous));
    return Math.max(max, similarity);
  }, 0);
}

async function generateDebaterStatement({
  speaker,
  proposalText,
  evidenceText,
  historyText,
  round,
  concreteClaims,
  unresolvedJudgePoints,
  opponentCurrentRoundStatement,
  retryInstruction,
}) {
  const isAdvocate = speaker === "advocate";
  const roleTitle = isAdvocate ? "ADVOCATE" : "SKEPTIC";
  const stanceGoal = isAdvocate
    ? "argue for funding the proposal"
    : "argue against funding the proposal";
  const finalAction = isAdvocate ? "supporting funding" : "opposing funding";

  const systemPrompt = [
    `You are the ${roleTitle} in a public-funding debate.`,
    `Your goal is to ${stanceGoal}.`,
    "Use concrete facts from proposal details, internet evidence, and prior debate context.",
    round > 1
      ? "For rounds 2 and 3, you must explicitly reference one concrete prior-round claim and one unresolved judge concern."
      : "For round 1, establish at least one concrete claim that can be challenged later.",
    opponentCurrentRoundStatement
      ? "You are speaking second this round. Directly rebut at least one claim from the current-round opponent statement."
      : "You are speaking first this round. Anticipate and pre-empt the strongest likely counterpoint.",
    "Respond with exactly one concise statement only (max 170 words, no bullets).",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    `Role: ${roleTitle}`,
    "",
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Previous rounds:",
    historyText,
    "",
    "Concrete claims from prior rounds:",
    formatNumberedList(concreteClaims, "No prior rounds yet."),
    "",
    "Unresolved judge points:",
    formatNumberedList(unresolvedJudgePoints, "No judge concerns yet."),
    "",
    opponentCurrentRoundStatement
      ? `Current-round opponent statement to rebut: ${opponentCurrentRoundStatement}`
      : "Current-round opponent statement to rebut: none yet.",
    "",
    round > 1
      ? "Mandatory: reference at least one concrete prior-round claim and one unresolved judge point."
      : "Mandatory: provide at least one concrete claim rooted in proposal or evidence.",
    `Write exactly one strong statement ${finalAction}.`,
    retryInstruction ? `Revision requirement: ${retryInstruction}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return callOpenRouter({
    model: isAdvocate ? MODELS.advocate : MODELS.skeptic,
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 260,
  });
}

async function generateDebaterStatementWithRetry({
  speaker,
  proposalText,
  evidenceText,
  historyText,
  round,
  rounds,
  concreteClaims,
  unresolvedJudgePoints,
  opponentCurrentRoundStatement,
}) {
  const previousStatements = rounds
    .map((entry) => (speaker === "advocate" ? entry.advocateStatement : entry.skepticStatement))
    .filter(Boolean);

  const firstAttempt = cleanStatement(
    await generateDebaterStatement({
      speaker,
      proposalText,
      evidenceText,
      historyText,
      round,
      concreteClaims,
      unresolvedJudgePoints,
      opponentCurrentRoundStatement,
      retryInstruction: "",
    })
  );

  if (!previousStatements.length) {
    return firstAttempt;
  }

  const firstSimilarity = maxSimilarityWithHistory(firstAttempt, previousStatements);
  if (firstSimilarity < REPETITION_SIMILARITY_THRESHOLD) {
    return firstAttempt;
  }

  const secondAttempt = cleanStatement(
    await generateDebaterStatement({
      speaker,
      proposalText,
      evidenceText,
      historyText,
      round,
      concreteClaims,
      unresolvedJudgePoints,
      opponentCurrentRoundStatement,
      retryInstruction: opponentCurrentRoundStatement
        ? "Your previous draft repeated prior phrasing. Use a clearly different angle and directly rebut one specific claim from the current-round opponent statement."
        : "Your previous draft repeated prior phrasing. Use a clearly different angle and pre-empt a likely counterargument without reusing prior sentence structures.",
    })
  );

  const secondSimilarity = maxSimilarityWithHistory(secondAttempt, previousStatements);
  return secondSimilarity <= firstSimilarity ? secondAttempt : firstAttempt;
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
    const speakingOrder = round % 2 === 1 ? ["advocate", "skeptic"] : ["skeptic", "advocate"];

    await onProgress({
      type: "round_started",
      round,
      speakingOrder,
    });
    ensureContinue();

    const historyText = formatHistory(rounds);
    const concreteClaims = extractConcreteClaims(rounds);
    const unresolvedJudgePoints = extractUnresolvedJudgePoints(rounds);

    let advocateStatement = "";
    let skepticStatement = "";

    if (speakingOrder[0] === "advocate") {
      advocateStatement = await generateDebaterStatementWithRetry({
        speaker: "advocate",
        proposalText,
        evidenceText,
        historyText,
        round,
        rounds,
        concreteClaims,
        unresolvedJudgePoints,
        opponentCurrentRoundStatement: "",
      });
      ensureContinue();

      skepticStatement = await generateDebaterStatementWithRetry({
        speaker: "skeptic",
        proposalText,
        evidenceText,
        historyText,
        round,
        rounds,
        concreteClaims,
        unresolvedJudgePoints,
        opponentCurrentRoundStatement: advocateStatement,
      });
    } else {
      skepticStatement = await generateDebaterStatementWithRetry({
        speaker: "skeptic",
        proposalText,
        evidenceText,
        historyText,
        round,
        rounds,
        concreteClaims,
        unresolvedJudgePoints,
        opponentCurrentRoundStatement: "",
      });
      ensureContinue();

      advocateStatement = await generateDebaterStatementWithRetry({
        speaker: "advocate",
        proposalText,
        evidenceText,
        historyText,
        round,
        rounds,
        concreteClaims,
        unresolvedJudgePoints,
        opponentCurrentRoundStatement: skepticStatement,
      });
    }

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
