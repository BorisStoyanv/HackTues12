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

function detectResponseLanguage(proposal) {
  const requested = String(proposal?.responseLanguage || "")
    .trim()
    .toLowerCase();

  if (requested === "en") {
    return {
      code: "en",
      name: "English",
    };
  }

  if (requested === "bg") {
    return {
      code: "bg",
      name: "Bulgarian",
    };
  }

  const proposalText = [
    proposal?.name || "",
    proposal?.location || "",
    proposal?.category || "",
    proposal?.info || "",
  ].join(" ");

  const cyrillicCount = (proposalText.match(/[\u0400-\u04FF]/g) || []).length;
  const latinCount = (proposalText.match(/[A-Za-z]/g) || []).length;

  // Default to English unless Cyrillic clearly dominates.
  if (cyrillicCount >= 6 && cyrillicCount > latinCount * 1.2) {
    return {
      code: "bg",
      name: "Bulgarian",
    };
  }

  return {
    code: "en",
    name: "English",
  };
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

const economicBriefSchema = z.object({
  visitor_estimate: z.string().min(1),
  income_estimate: z.string().min(1),
  payback_estimate: z.string().min(1),
  assumptions: z.array(z.string().min(1)).max(8).default([]),
  evidence_gaps: z.array(z.string().min(1)).max(8).default([]),
  advocate_talking_points: z.array(z.string().min(1)).min(3).max(8),
});

function formatEconomicBrief(brief) {
  return [
    `Visitor estimate: ${brief.visitorEstimate}`,
    `Income estimate: ${brief.incomeEstimate}`,
    `Payback estimate: ${brief.paybackEstimate}`,
    "Assumptions:",
    formatNumberedList(brief.assumptions, "No assumptions listed."),
    "Evidence gaps:",
    formatNumberedList(brief.evidenceGaps, "No explicit gaps listed."),
    "Advocate talking points:",
    formatNumberedList(brief.advocateTalkingPoints, "No talking points listed."),
  ].join("\n");
}

async function buildEconomicBrief({ proposalText, evidenceText, responseLanguageName }) {
  const systemPrompt = [
    "You are an infrastructure economics analyst.",
    "Create a concise, assumption-aware baseline for visitors, income, and payback period.",
    "Use only proposal details and provided evidence. Do not fabricate certainty.",
    "If direct data is missing, provide conservative ranges and clearly list assumptions.",
    `Write all natural-language fields in ${responseLanguageName}.`,
    "Return JSON only.",
  ].join(" ");

  const userPrompt = [
    `Language: ${responseLanguageName}`,
    "Proposal:",
    proposalText,
    "",
    "Evidence:",
    evidenceText,
    "",
    "Return exactly this JSON schema:",
    '{"visitor_estimate":"range or reasoned estimate","income_estimate":"annual income or range","payback_estimate":"years or range","assumptions":["..."],"evidence_gaps":["..."],"advocate_talking_points":["..."]}',
  ].join("\n");

  const parsed = economicBriefSchema.parse(
    await callModelForJson({
      model: MODELS.judge,
      systemPrompt,
      userPrompt,
      maxTokens: 1800,
      temperature: undefined,
      includeReasoning: false,
      reasoning: { effort: "low" },
    })
  );

  return {
    visitorEstimate: parsed.visitor_estimate.trim(),
    incomeEstimate: parsed.income_estimate.trim(),
    paybackEstimate: parsed.payback_estimate.trim(),
    assumptions: parsed.assumptions.map((item) => item.trim()).filter(Boolean),
    evidenceGaps: parsed.evidence_gaps.map((item) => item.trim()).filter(Boolean),
    advocateTalkingPoints: parsed.advocate_talking_points.map((item) => item.trim()).filter(Boolean),
  };
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

function countMissingInfoSignals(text) {
  const normalized = String(text || "").toLowerCase();
  const patterns = [
    /missing information/g,
    /missing data/g,
    /lack of data/g,
    /insufficient data/g,
    /no data/g,
    /no evidence/g,
    /unclear/g,
    /unknown/g,
    /no (clear )?(visitor|visitors|income|revenue|economic impact)/g,
    /missing (visitor|income|revenue|economic impact)/g,
  ];

  return patterns.reduce((sum, pattern) => sum + (normalized.match(pattern) || []).length, 0);
}

async function generateDebaterStatement({
  speaker,
  proposalText,
  evidenceText,
  economicBriefText,
  historyText,
  responseLanguageName,
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
    isAdvocate
      ? "Use the economic baseline to anchor at least one quantified argument (visitors, income, or payback), explicitly labeling assumptions where needed."
      : "Critique weak assumptions and overconfident projections from the economic baseline, but do not ignore credible quantified points.",
    isAdvocate
      ? "Reasonable, clearly labeled assumptions are allowed when hard data is incomplete."
      : "You may mention missing information only once; the rest must focus on concrete risks/trade-offs (execution, cost overruns, operating cost, demand volatility, governance, opportunity cost).",
    round > 1
      ? "For rounds 2 and 3, you must explicitly reference one concrete prior-round claim and one unresolved judge concern."
      : "For round 1, establish at least one concrete claim that can be challenged later.",
    opponentCurrentRoundStatement
      ? "You are speaking second this round. Directly rebut at least one claim from the current-round opponent statement."
      : "You are speaking first this round. Anticipate and pre-empt the strongest likely counterpoint.",
    `All natural-language output must be in ${responseLanguageName}.`,
    "Respond with exactly one concise statement only (max 170 words, no bullets).",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    `Role: ${roleTitle}`,
    `Response language: ${responseLanguageName}`,
    "",
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Economic baseline (assumption-aware):",
    economicBriefText,
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
    isAdvocate
      ? "Mandatory: include at least one quantified economic point (visitors, income, or payback) and clearly flag assumptions."
      : "Mandatory: challenge at least one concrete economic number or assumption.",
    isAdvocate
      ? "Mandatory: if evidence is incomplete, still provide a defendable range estimate with explicit assumptions."
      : "Mandatory: limit missing-data criticism to one short sentence and include at least two non-data risk arguments.",
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
  economicBriefText,
  historyText,
  responseLanguageName,
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
      economicBriefText,
      historyText,
      responseLanguageName,
      round,
      concreteClaims,
      unresolvedJudgePoints,
      opponentCurrentRoundStatement,
      retryInstruction: "",
    })
  );

  const isSkeptic = speaker === "skeptic";
  const missingInfoOverfocus = isSkeptic && countMissingInfoSignals(firstAttempt) > 1;

  if (!previousStatements.length && !missingInfoOverfocus) {
    return firstAttempt;
  }

  const firstSimilarity = maxSimilarityWithHistory(firstAttempt, previousStatements);
  if (firstSimilarity < REPETITION_SIMILARITY_THRESHOLD && !missingInfoOverfocus) {
    return firstAttempt;
  }

  const secondAttempt = cleanStatement(
    await generateDebaterStatement({
      speaker,
      proposalText,
      evidenceText,
      economicBriefText,
      historyText,
      responseLanguageName,
      round,
      concreteClaims,
      unresolvedJudgePoints,
      opponentCurrentRoundStatement,
      retryInstruction: missingInfoOverfocus
        ? "Your previous draft over-focused on missing information. Keep missing-data criticism to one short sentence and build the rest around concrete non-data risks and trade-offs."
        : opponentCurrentRoundStatement
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

async function judgeRound({
  proposalText,
  evidenceText,
  economicBriefText,
  historyText,
  responseLanguageName,
  round,
  evidenceGapPenaltyUsed,
  advocateStatement,
  skepticStatement,
}) {
  const systemPrompt = [
    "You are the neutral JUDGE in a funding debate.",
    "Evaluate only argument quality and evidence use.",
    "Scoring rule: 0.5 is neutral/tie, >0.5 means advocate stronger, <0.5 means skeptic stronger.",
    "Do not automatically favor the skeptic just because some evidence is missing.",
    "Reasonable, explicitly labeled assumptions and ranges are valid argumentation when hard data is limited.",
    "Penalize generic or repetitive 'missing information' claims if they are not paired with substantive alternative risk analysis.",
    "Evidence-gap penalty can be applied at most once across all rounds.",
    evidenceGapPenaltyUsed
      ? "Evidence-gap penalty was already used in a previous round, so in this round you must not reduce score due to missing evidence."
      : "If missing evidence materially affects confidence, you may apply an evidence-gap penalty in this round.",
    `Write the rationale in ${responseLanguageName}.`,
    'Keep "winner" strictly as advocate|skeptic|tie and "score" as a number in [0,1].',
    "Return JSON only.",
  ].join(" ");

  const userPrompt = [
    `Round: ${round} of ${ROUND_COUNT}`,
    `Rationale language: ${responseLanguageName}`,
    `Evidence-gap penalty already used in prior rounds: ${evidenceGapPenaltyUsed ? "yes" : "no"}`,
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Economic baseline:",
    economicBriefText,
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

async function judgeFinal({ proposalText, evidenceText, economicBriefText, responseLanguageName, rounds }) {
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
    "Do not automatically penalize the advocate for every evidence gap if assumptions were explicit and reasonable.",
    "Do not over-reward repetitive generic skepticism focused only on missing information.",
    "Treat evidence-gap downside as already accounted for at most once in round scoring; do not repeatedly penalize the same gap in the final view.",
    `Write the rationale in ${responseLanguageName}.`,
    'Keep "funding_recommendation" strictly as one of: fund, defer, reject (in English).',
    "Return JSON only.",
  ].join(" ");

  const userPrompt = [
    `Rationale language: ${responseLanguageName}`,
    "Proposal:",
    proposalText,
    "",
    "Internet evidence:",
    evidenceText,
    "",
    "Economic baseline:",
    economicBriefText,
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
  const responseLanguage = detectResponseLanguage(proposal);
  const proposalText = formatProposal(proposal);
  const evidence = await collectInternetEvidence(proposal);
  const evidenceText = formatEvidence(evidence);
  await onProgress({
    type: "internet_evidence",
    internetEvidence: evidence,
  });
  ensureContinue();
  const economicBrief = await buildEconomicBrief({
    proposalText,
    evidenceText,
    responseLanguageName: responseLanguage.name,
  });
  const economicBriefText = formatEconomicBrief(economicBrief);
  await onProgress({
    type: "economic_brief",
    economicBrief,
  });
  ensureContinue();

  const rounds = [];
  let evidenceGapPenaltyUsed = false;

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
        economicBriefText,
        historyText,
        responseLanguageName: responseLanguage.name,
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
        economicBriefText,
        historyText,
        responseLanguageName: responseLanguage.name,
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
        economicBriefText,
        historyText,
        responseLanguageName: responseLanguage.name,
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
        economicBriefText,
        historyText,
        responseLanguageName: responseLanguage.name,
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
      economicBriefText,
      historyText,
      responseLanguageName: responseLanguage.name,
      round,
      evidenceGapPenaltyUsed,
      advocateStatement,
      skepticStatement,
    });

    const rationaleHasEvidenceGapFocus = countMissingInfoSignals(judgment.rationale) > 0;

    if (rationaleHasEvidenceGapFocus && judgment.score < 0.5) {
      if (!evidenceGapPenaltyUsed) {
        evidenceGapPenaltyUsed = true;
      } else {
        judgment.score = 0.5;
        judgment.winner = "tie";
      }
    }

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
    economicBriefText,
    responseLanguageName: responseLanguage.name,
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
    economicBrief,
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
