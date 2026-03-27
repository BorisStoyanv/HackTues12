import { z } from "zod";
import { callOpenRouter } from "./openrouter.js";
import { collectInternetEvidence } from "./internetResearch.js";
import { clamp, extractJsonObject } from "./jsonUtils.js";

const MODELS = {
  advocate: "openai/gpt-4.1-mini",
  skeptic: "anthropic/claude-haiku-4.5",
  judge: "openai/gpt-5-nano",
};

const ROUND_COUNT = 3;
const REPETITION_SIMILARITY_THRESHOLD = 0.68;
const MAX_CARRYOVER_ITEMS = 6;
const ROUND_WINNER_TIE_BAND = 0.05;
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
            `   Matched query: ${source.matchedQuery || "n/a"}`,
            `   Snippet: ${source.snippet || "n/a"}`,
            `   Avg daily pageviews (30d): ${pageviews}`,
            `   Summary: ${summary}`,
          ].join("\n");
        })
        .join("\n")
    : "No reliable external sources found.";

  const searchQueriesText = (evidence.searchQueries || []).length
    ? evidence.searchQueries.map((query, index) => `${index + 1}. ${query}`).join("\n")
    : "No search queries recorded.";

  return [
    `Search text: ${evidence.searchText}`,
    "Search queries used:",
    searchQueriesText,
    `Geo hint: ${
      evidence.geoHint
        ? `${evidence.geoHint.displayName} (lat ${evidence.geoHint.lat}, lon ${evidence.geoHint.lon})`
        : "unavailable"
    }`,
    "Sources:",
    sourceLines,
    "Country tourism/economic context:",
    formatCountryEconomicContext(evidence.countryEconomicContext),
  ].join("\n");
}

function formatLargeNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "unknown";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(numeric));
}

function formatCountryEconomicContext(countryEconomicContext) {
  if (!countryEconomicContext) {
    return "No country-level indicators available.";
  }

  const lines = [`Country: ${countryEconomicContext.country} (${countryEconomicContext.countryCode})`];

  if (countryEconomicContext.tourismArrivals) {
    lines.push(
      `Tourism arrivals (${countryEconomicContext.tourismArrivals.year}): ${formatLargeNumber(
        countryEconomicContext.tourismArrivals.value
      )} [${countryEconomicContext.tourismArrivals.sourceUrl}]`
    );
  }

  if (countryEconomicContext.tourismReceiptsUsd) {
    lines.push(
      `Tourism receipts USD (${countryEconomicContext.tourismReceiptsUsd.year}): ${formatLargeNumber(
        countryEconomicContext.tourismReceiptsUsd.value
      )} [${countryEconomicContext.tourismReceiptsUsd.sourceUrl}]`
    );
  }

  if (countryEconomicContext.gdpUsd) {
    lines.push(
      `GDP USD (${countryEconomicContext.gdpUsd.year}): ${formatLargeNumber(
        countryEconomicContext.gdpUsd.value
      )} [${countryEconomicContext.gdpUsd.sourceUrl}]`
    );
  }

  return lines.join("\n");
}

function formatRealWorldDataPoints(evidence) {
  const points = [];

  for (const source of evidence.sources || []) {
    if (source.avgDailyPageviews30d !== null) {
      points.push(
        `${source.title}: avg daily Wikipedia pageviews (30d) = ${source.avgDailyPageviews30d} [${source.url}]`
      );
    }
  }

  const context = evidence.countryEconomicContext;
  if (context?.tourismArrivals) {
    points.push(
      `${context.country}: international tourism arrivals (${context.tourismArrivals.year}) = ${formatLargeNumber(
        context.tourismArrivals.value
      )} [${context.tourismArrivals.sourceUrl}]`
    );
  }

  if (context?.tourismReceiptsUsd) {
    points.push(
      `${context.country}: tourism receipts USD (${context.tourismReceiptsUsd.year}) = ${formatLargeNumber(
        context.tourismReceiptsUsd.value
      )} [${context.tourismReceiptsUsd.sourceUrl}]`
    );
  }

  if (context?.gdpUsd) {
    points.push(
      `${context.country}: GDP USD (${context.gdpUsd.year}) = ${formatLargeNumber(
        context.gdpUsd.value
      )} [${context.gdpUsd.sourceUrl}]`
    );
  }

  if (!points.length) {
    return "No strong numeric datapoints were found from web sources.";
  }

  return formatNumberedList(points, "No datapoints available.");
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
    /insufficient information/g,
    /not enough information/g,
    /missing data/g,
    /lack of data/g,
    /lack of evidence/g,
    /absence of (data|evidence|proof|visitor|income|revenue|economic impact)/g,
    /insufficient data/g,
    /no data/g,
    /no evidence/g,
    /without (a|any) (clear|defined|documented) (model|plan|evidence|data)/g,
    /unclear/g,
    /unknown/g,
    /no (clear )?(visitor|visitors|income|revenue|economic impact)/g,
    /missing (visitor|income|revenue|economic impact)/g,
  ];

  return patterns.reduce((sum, pattern) => sum + (normalized.match(pattern) || []).length, 0);
}

function sanitizeSkepticMissingDataPhrases(text) {
  return cleanStatement(
    String(text || "")
      .replace(/missing information/gi, "fragile assumptions")
      .replace(/insufficient information/gi, "fragile assumptions")
      .replace(/not enough information/gi, "fragile assumptions")
      .replace(/missing data/gi, "fragile assumptions")
      .replace(/lack of data/gi, "fragile assumptions")
      .replace(/lack of evidence/gi, "fragile support")
      .replace(/absence of (data|evidence|proof)/gi, "fragile support")
      .replace(/absence of (visitor|income|revenue|economic impact)/gi, "fragile $1 assumptions")
      .replace(/insufficient data/gi, "fragile assumptions")
      .replace(/no data/gi, "fragile assumptions")
      .replace(/no evidence/gi, "fragile support")
      .replace(/without (a|any) (clear|defined|documented) (model|plan|evidence|data)/gi, "with a fragile $3")
      .replace(/\bunknown\b/gi, "uncertain")
      .replace(/\bunclear\b/gi, "ambiguous")
      .replace(/missing (visitor|income|revenue|economic impact)/gi, "fragile $1 assumptions")
      .replace(/no (clear )?(visitor|visitors|income|revenue|economic impact)/gi, "fragile $2 assumptions")
  );
}

function countConcreteSignals(text) {
  return splitSentences(text).reduce((sum, sentence) => sum + (looksConcreteClaim(sentence) ? 1 : 0), 0);
}

function containsUrl(text) {
  return /https?:\/\/\S+/i.test(String(text || ""));
}

function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

function countUrls(text) {
  return (String(text || "").match(/https?:\/\/\S+/gi) || []).length;
}

function hasUncertaintyLabel(sentence) {
  return /(assum|estimate|range|approx|around|about|roughly|may|might|could|likely|scenario|if\b|baseline|conservative|stress|sensitivity|downside|upside)/i.test(
    String(sentence || "")
  );
}

function hasProposalAttribution(sentence) {
  return /(proposal|as provided|as stated|submitted brief|project brief|according to the proposal|proposal-stated|from the proposal)/i.test(
    String(sentence || "")
  );
}

function countProposalAttributionSignals(text) {
  return (String(text || "").match(
    /(proposal-stated|according to the proposal|as stated in the proposal|from the proposal|proposal specifies|submitted proposal)/gi
  ) || []).length;
}

function countScenarioSignals(text) {
  return (String(text || "").match(
    /(scenario|sensitivity|stress test|downside case|base case|upside case|low[- ]case|high[- ]case|conversion rate)/gi
  ) || []).length;
}

function countMitigationSignals(text) {
  return (String(text || "").match(
    /(mitigation|contingency|fallback|buffer|reserve|performance bond|fixed-price|fixed price|kpi|audit|phased disbursement|gated release|ring-fenced|risk control)/gi
  ) || []).length;
}

function countUnsupportedNumericClaims(text) {
  return splitSentences(text).reduce((sum, sentence) => {
    if (!/\d/.test(sentence)) {
      return sum;
    }

    if (containsUrl(sentence) || hasUncertaintyLabel(sentence) || hasProposalAttribution(sentence)) {
      return sum;
    }

    return sum + 1;
  }, 0);
}

function countProposalOnlyNumericClaims(text) {
  return splitSentences(text).reduce((sum, sentence) => {
    if (!/\d/.test(sentence)) {
      return sum;
    }

    if (hasProposalAttribution(sentence) && !containsUrl(sentence)) {
      return sum + 1;
    }

    return sum;
  }, 0);
}

function countOverconfidentClaims(text) {
  const patterns = [
    /\bguarantee(s|d)?\b/gi,
    /\bdefinitely\b/gi,
    /\bcertain(ly)?\b/gi,
    /\bundeniable\b/gi,
    /\bno doubt\b/gi,
    /\bwill (always|certainly|definitely)\b/gi,
  ];

  return patterns.reduce((sum, pattern) => sum + (String(text || "").match(pattern) || []).length, 0);
}

function computeStatementQualityScore({ statement, role }) {
  const concreteSignals = countConcreteSignals(statement);
  const citations = countUrls(statement);
  const unsupportedNumericClaims = countUnsupportedNumericClaims(statement);
  const proposalOnlyNumericClaims = countProposalOnlyNumericClaims(statement);
  const overconfidentClaims = countOverconfidentClaims(statement);
  const proposalAttributions = countProposalAttributionSignals(statement);
  const scenarioSignals = countScenarioSignals(statement);
  const mitigationSignals = countMitigationSignals(statement);
  const uncertaintyLabels = (String(statement || "").match(
    /(assum|estimate|range|scenario|conservative|baseline|if\b|may|might|could|likely|stress|sensitivity|downside)/gi
  ) || []).length;

  let quality =
    Math.min(5, concreteSignals) * 0.16 +
    Math.min(2, citations) * 0.24 +
    (citations > 0 ? Math.min(2, proposalAttributions) * 0.06 : 0) +
    Math.min(2, scenarioSignals) * 0.1 +
    Math.min(2, mitigationSignals) * 0.08 +
    Math.min(2, uncertaintyLabels) * 0.08 -
    unsupportedNumericClaims * 0.18 -
    proposalOnlyNumericClaims * 0.1 -
    overconfidentClaims * 0.08;

  if (unsupportedNumericClaims >= 2 && citations === 0) {
    quality -= 0.06;
  }

  // Skeptical claims with numbers but no source/caveat should not be treated as inherently stronger.
  if (role === "skeptic" && concreteSignals > 0 && citations === 0 && unsupportedNumericClaims > 0) {
    quality -= 0.1;
  }

  return Number(quality.toFixed(3));
}

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function assessProposalViability(proposal) {
  const combinedText = [
    proposal?.name || "",
    proposal?.category || "",
    proposal?.location || "",
    proposal?.info || "",
  ]
    .join(" ")
    .trim();

  const normalized = combinedText.toLowerCase();

  const commitmentPatterns = [
    /\bsigned (mou|agreement|contract|partnership|operator|partner)\b/i,
    /\b(co[- ]funding|match funding).*(committed|approved|secured)\b/i,
    /\b(committed|approved|secured).*(co[- ]funding|match funding)\b/i,
    /\bletter of intent\b/i,
    /\bapproved sponsor match\b/i,
  ];
  const executionControlPatterns = [
    /\bfixed[- ]price\b/i,
    /\bperformance bond\b/i,
    /\bmilestone[- ]gated\b/i,
    /\bkpi[- ]gated\b/i,
    /\bthird[- ]party audit\b/i,
    /\bchange[- ]order cap\b/i,
    /\bphased disbursement\b/i,
  ];
  const financialPlanPatterns = [
    /\bopex\b/i,
    /\bcapex\b/i,
    /\bcontingency reserve\b/i,
    /\bring[- ]fenced reserve\b/i,
    /\bbudget\b/i,
    /\bpayback\b/i,
    /\brevenue\b/i,
    /\bcash flow\b/i,
  ];
  const deliveryPlanPatterns = [
    /\btimeline\b/i,
    /\bphase[- ]\d+\b/i,
    /\bquarterly\b/i,
    /\bmonthly\b/i,
    /\bimplementation\b/i,
    /\brollout\b/i,
    /\bprocurement\b/i,
    /\bmaintenance\b/i,
  ];
  const riskPlanPatterns = [
    /\bdownside\b/i,
    /\bsensitivity\b/i,
    /\bstress test\b/i,
    /\bbase case\b/i,
    /\bupside case\b/i,
    /\bmitigation\b/i,
    /\bfallback\b/i,
  ];

  const redFlagMatchers = [
    { pattern: /\bno signed partners?\b/i, label: "no signed partners" },
    { pattern: /\bno detailed budget\b/i, label: "no detailed budget" },
    { pattern: /\bno opex plan\b/i, label: "no OPEX plan" },
    { pattern: /\bno timeline\b/i, label: "no timeline" },
    { pattern: /\bno contracting strategy\b/i, label: "no contracting strategy" },
    { pattern: /\bsomehow\b/i, label: "vague delivery language" },
    { pattern: /\bto be determined\b|\btbd\b/i, label: "to-be-determined plan" },
    { pattern: /\bexpected .* assumed\b|\bassumed\b/i, label: "assumption-heavy projection" },
    { pattern: /\bhuge (tourism )?growth\b/i, label: "overstated growth language" },
  ];

  const dimensions = {
    commitmentEvidence: hasAnyPattern(normalized, commitmentPatterns),
    executionControls: hasAnyPattern(normalized, executionControlPatterns),
    financialPlan: hasAnyPattern(normalized, financialPlanPatterns),
    deliveryPlan: hasAnyPattern(normalized, deliveryPlanPatterns),
    riskPlanning: hasAnyPattern(normalized, riskPlanPatterns),
  };

  const baseScore =
    (dimensions.commitmentEvidence ? 0.25 : 0) +
    (dimensions.executionControls ? 0.25 : 0) +
    (dimensions.financialPlan ? 0.2 : 0) +
    (dimensions.deliveryPlan ? 0.15 : 0) +
    (dimensions.riskPlanning ? 0.15 : 0);

  const redFlags = redFlagMatchers
    .filter((matcher) => matcher.pattern.test(normalized))
    .map((matcher) => matcher.label);

  const score = Number(clamp(baseScore - Math.min(0.45, redFlags.length * 0.08), 0, 1).toFixed(3));
  const classification =
    score >= 0.7 ? "robust" : score >= 0.45 ? "mixed" : "fragile";

  const strengths = [];
  const gaps = [];

  if (dimensions.commitmentEvidence) strengths.push("documented partner/funding commitments");
  else gaps.push("missing documented commitments");
  if (dimensions.executionControls) strengths.push("execution controls");
  else gaps.push("weak execution controls");
  if (dimensions.financialPlan) strengths.push("financial planning detail");
  else gaps.push("weak financial planning detail");
  if (dimensions.deliveryPlan) strengths.push("delivery/timeline structure");
  else gaps.push("weak delivery/timeline structure");
  if (dimensions.riskPlanning) strengths.push("risk/downside planning");
  else gaps.push("weak downside risk planning");

  return {
    score,
    classification,
    strengths,
    gaps,
    redFlags,
  };
}

function formatProposalViabilityProfile(profile) {
  return [
    `Classification: ${profile.classification}`,
    `Score: ${profile.score}`,
    `Strength signals: ${profile.strengths.length ? profile.strengths.join("; ") : "none"}`,
    `Gap signals: ${profile.gaps.length ? profile.gaps.join("; ") : "none"}`,
    `Red flags: ${profile.redFlags.length ? profile.redFlags.join("; ") : "none"}`,
  ].join("\n");
}

function computeViabilityScoreAdjustment({
  proposalViability,
  advocateStatement,
  skepticStatement,
}) {
  if (!proposalViability) {
    return 0;
  }

  const viabilityScore = Number(proposalViability.score);
  const advocateCitations = countUrls(advocateStatement);
  const advocateMitigationSignals = countMitigationSignals(advocateStatement);
  const advocateScenarioSignals = countScenarioSignals(advocateStatement);
  const advocateUnsupportedNumericClaims = countUnsupportedNumericClaims(advocateStatement);
  const skepticConcreteSignals = countConcreteSignals(skepticStatement);
  const skepticCitations = countUrls(skepticStatement);

  if (viabilityScore < 0.45) {
    let penalty = (0.45 - viabilityScore) * 0.3;

    if (advocateCitations > 0) {
      penalty *= 0.75;
    }
    if (advocateMitigationSignals > 0 && advocateScenarioSignals > 0) {
      penalty *= 0.75;
    }

    penalty += Math.min(0.05, advocateUnsupportedNumericClaims * 0.015);

    if (skepticConcreteSignals >= 2) {
      penalty += 0.015;
    }
    if (skepticCitations > 0) {
      penalty += 0.015;
    }

    return -Math.min(0.11, penalty);
  }

  if (viabilityScore > 0.72) {
    let bonus = (viabilityScore - 0.72) * 0.2;

    if (advocateCitations === 0) {
      bonus *= 0.75;
    }
    if (advocateMitigationSignals === 0 || advocateScenarioSignals === 0) {
      bonus *= 0.7;
    }

    return Math.min(0.06, bonus);
  }

  return 0;
}

function deriveWinnerFromScore(score) {
  if (score > 0.5 + ROUND_WINNER_TIE_BAND) {
    return "advocate";
  }
  if (score < 0.5 - ROUND_WINNER_TIE_BAND) {
    return "skeptic";
  }

  return "tie";
}

function calibrateRoundScore({
  score,
  rationale,
  advocateStatement,
  skepticStatement,
  proposalViability,
}) {
  let adjusted = score;
  const advocateConcreteSignals = countConcreteSignals(advocateStatement);
  const skepticConcreteSignals = countConcreteSignals(skepticStatement);
  const advocateQuality = computeStatementQualityScore({
    statement: advocateStatement,
    role: "advocate",
  });
  const skepticQuality = computeStatementQualityScore({
    statement: skepticStatement,
    role: "skeptic",
  });
  const qualityDelta = advocateQuality - skepticQuality;

  // Prevent automatic skeptic edge when advocate provides at least as many concrete claims.
  if (adjusted < 0.5 && advocateConcreteSignals >= skepticConcreteSignals) {
    const concreteDelta = advocateConcreteSignals - skepticConcreteSignals;
    adjusted += concreteDelta > 0 ? Math.min(0.08, 0.02 * concreteDelta) : 0.03;
  }

  // Apply a symmetric quality correction so unsupported skeptical critique does not dominate by default.
  adjusted += clamp(qualityDelta * 0.18, -0.12, 0.12);

  // If both statements look similarly strong/weak, pull slightly toward tie.
  if (Math.abs(qualityDelta) < 0.12) {
    adjusted = 0.5 + (adjusted - 0.5) * 0.7;
  }

  // Deterministic prior from proposal viability profile.
  adjusted += computeViabilityScoreAdjustment({
    proposalViability,
    advocateStatement,
    skepticStatement,
  });

  // Missing-info framing should not dominate round scoring.
  if (adjusted < 0.5 && countMissingInfoSignals(rationale) > 0) {
    adjusted = Math.min(0.5, adjusted + 0.06);
  }

  return Number(clamp(adjusted, 0, 1).toFixed(3));
}

async function generateDebaterStatement({
  speaker,
  proposalText,
  evidenceText,
  economicBriefText,
  realWorldDataPointsText,
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
    "Do not invent facts, commitments, contracts, partnerships, or numeric baselines that are not present in proposal details, internet evidence, or prior debate context.",
    isAdvocate
      ? "Use the economic baseline to anchor at least one quantified argument (visitors, income, or payback), explicitly labeling assumptions where needed."
      : "Critique weak assumptions and overconfident projections from the economic baseline, but do not ignore credible quantified points.",
    isAdvocate
      ? "Use real-world internet datapoints and cite at least one source URL exactly as given."
      : "Engage with concrete datapoints directly instead of dismissing them, and cite source URL(s) when making quantitative critiques.",
    isAdvocate
      ? "Reasonable, clearly labeled assumptions are allowed when hard data is incomplete."
      : "You may cite evidence gaps only when each gap is tied to a concrete downside mechanism (cost, demand, execution, governance, or legal risk).",
    isAdvocate
      ? "Avoid overconfident certainty language; make confidence proportional to evidence."
      : "If you use numeric claims (cost overruns, percentages, ROI windows), either cite a provided source URL or explicitly label them as hypothetical scenarios.",
    isAdvocate
      ? "When using proposal-provided numbers (MOUs, co-funding, visitor targets, unit economics), explicitly mark them as proposal-stated facts and distinguish them from assumptions."
      : "If you challenge proposal-provided numbers, explain whether the issue is conversion risk, execution risk, or governance risk instead of generic dismissal.",
    isAdvocate
      ? "Include one downside sensitivity case and one concrete mitigation control linked to delivery mechanics (performance bond, fixed-price scope, reserve, phased disbursement, audit, KPI gates)."
      : "A strong rebuttal should engage the advocate's mitigation controls directly when present.",
    isAdvocate
      ? "When making upside claims, explicitly state preconditions required for those outcomes."
      : "When proposal controls are weak or vague, explicitly connect that weakness to lower execution confidence and weaker expected ROI.",
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
    "Real-world datapoints pack (internet-derived):",
    realWorldDataPointsText,
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
      ? "Mandatory: cite at least one source URL from the datapoints pack in parentheses."
      : "Mandatory: reference at least one datapoint from the pack when rebutting and include at least one source URL if you use any numeric critique.",
    isAdvocate
      ? "Mandatory: if evidence is incomplete, still provide a defendable range estimate with explicit assumptions and mark proposal-stated numbers as such."
      : "Mandatory: include at least two concrete risk arguments (execution, cost overrun, OPEX, demand volatility, governance, opportunity cost).",
    isAdvocate
      ? "Mandatory: include one downside sensitivity scenario and one concrete mitigation control."
      : "Mandatory: if you claim downside, show why existing mitigation controls are insufficient.",
    `Write exactly one strong statement ${finalAction}.`,
    retryInstruction ? `Revision requirement: ${retryInstruction}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return callOpenRouter({
    model: isAdvocate ? MODELS.advocate : MODELS.skeptic,
    systemPrompt,
    userPrompt,
    temperature: isAdvocate ? 0.25 : 0.35,
    maxTokens: 320,
  });
}

async function generateDebaterStatementWithRetry({
  speaker,
  proposalText,
  evidenceText,
  economicBriefText,
  realWorldDataPointsText,
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
      realWorldDataPointsText,
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
  const skepticOverusesGenericMissingData =
    isSkeptic && countMissingInfoSignals(firstAttempt) > 2 && countConcreteSignals(firstAttempt) < 2;
  const advocateMissingCitation = speaker === "advocate" && !containsUrl(firstAttempt);
  const advocateMissingProposalAttribution =
    speaker === "advocate" && countProposalAttributionSignals(firstAttempt) === 0;
  const advocateMissingScenario = speaker === "advocate" && countScenarioSignals(firstAttempt) === 0;
  const advocateMissingMitigation = speaker === "advocate" && countMitigationSignals(firstAttempt) === 0;
  const skepticUncitedNumbers = isSkeptic && countUnsupportedNumericClaims(firstAttempt) > 0 && !containsUrl(firstAttempt);

  if (
    !previousStatements.length &&
    !skepticOverusesGenericMissingData &&
    !advocateMissingCitation &&
    !advocateMissingProposalAttribution &&
    !advocateMissingScenario &&
    !advocateMissingMitigation &&
    !skepticUncitedNumbers
  ) {
    return firstAttempt;
  }

  const firstSimilarity = maxSimilarityWithHistory(firstAttempt, previousStatements);
  if (
    firstSimilarity < REPETITION_SIMILARITY_THRESHOLD &&
    !skepticOverusesGenericMissingData &&
    !advocateMissingCitation &&
    !advocateMissingProposalAttribution &&
    !advocateMissingScenario &&
    !advocateMissingMitigation &&
    !skepticUncitedNumbers
  ) {
    return firstAttempt;
  }

  let retryInstruction = "";
  if (
    speaker === "advocate" &&
    (advocateMissingCitation ||
      advocateMissingProposalAttribution ||
      advocateMissingScenario ||
      advocateMissingMitigation)
  ) {
    const advocateRequirements = [];
    if (advocateMissingCitation) {
      advocateRequirements.push(
        "Include at least one concrete numeric datapoint and one source URL exactly as given in the datapoints pack."
      );
    }
    if (advocateMissingProposalAttribution) {
      advocateRequirements.push(
        "Explicitly mark at least one key numeric claim as proposal-stated fact."
      );
    }
    if (advocateMissingScenario) {
      advocateRequirements.push(
        "Add one downside sensitivity scenario (for example lower conversion or attendance)."
      );
    }
    if (advocateMissingMitigation) {
      advocateRequirements.push(
        "Add one concrete mitigation control tied to execution/governance (for example performance bond, reserve, phased disbursement, audit, KPI gate)."
      );
    }

    retryInstruction = `Your previous draft did not meet advocate structure requirements. ${advocateRequirements.join(
      " "
    )}`;
  } else if (skepticUncitedNumbers) {
    retryInstruction =
      "Your previous draft used numeric critiques without source support. Add at least one source URL from the datapoints pack, or label numbers as hypothetical scenarios.";
  } else if (skepticOverusesGenericMissingData) {
    retryInstruction =
      "Your previous draft leaned on generic evidence-gap language. Keep at most one evidence-gap mention, and tie it to concrete downside mechanism with quantified impact.";
  } else if (opponentCurrentRoundStatement) {
    retryInstruction =
      "Your previous draft repeated prior phrasing. Use a clearly different angle and directly rebut one specific claim from the current-round opponent statement.";
  } else {
    retryInstruction =
      "Your previous draft repeated prior phrasing. Use a clearly different angle and pre-empt a likely counterargument without reusing prior sentence structures.";
  }

  const secondAttempt = cleanStatement(
    await generateDebaterStatement({
      speaker,
      proposalText,
      evidenceText,
      economicBriefText,
      realWorldDataPointsText,
      historyText,
      responseLanguageName,
      round,
      concreteClaims,
      unresolvedJudgePoints,
      opponentCurrentRoundStatement,
      retryInstruction,
    })
  );

  const secondSimilarity = maxSimilarityWithHistory(secondAttempt, previousStatements);
  const selected = secondSimilarity <= firstSimilarity ? secondAttempt : firstAttempt;

  if (speaker === "advocate" && !containsUrl(selected)) {
    const fallbackUrl = extractFirstUrl(realWorldDataPointsText) || extractFirstUrl(evidenceText);
    if (fallbackUrl) {
      return `${selected} (Source: ${fallbackUrl})`;
    }
  }

  return selected;
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
  proposalViability,
  advocateStatement,
  skepticStatement,
}) {
  const systemPrompt = [
    "You are the neutral JUDGE in a funding debate.",
    "Evaluate only argument quality and evidence use.",
    "Scoring rule: 0.5 is neutral/tie, >0.5 means advocate stronger, <0.5 means skeptic stronger.",
    "Apply equal skepticism to BOTH sides. Unsupported skeptical claims are penalized just like unsupported advocate claims.",
    "Start from 0.5 and move only when there is a clear argument-quality advantage.",
    "Default to tie when both sides are similarly plausible.",
    "Score mapping guideline: keep score in [0.45, 0.55] unless one side has a clear, evidence-backed argument-quality edge.",
    "Use the provided deterministic proposal viability profile as prior context: fragile proposals require stronger advocate proof; robust proposals require stronger skeptic proof to overturn.",
    "Do not automatically favor the skeptic just because some evidence is missing.",
    "Proposal-stated numeric facts are admissible when explicitly attributed to the proposal; they are weaker than external evidence but should not be treated as fabricated.",
    "Reasonable, explicitly labeled assumptions and ranges are valid argumentation when hard data is limited.",
    "Reward explicit downside sensitivity and concrete mitigation controls when they are coherent and relevant.",
    "Penalize any side that introduces concrete facts not supported by proposal text, internet evidence, or prior-round statements.",
    "Penalize generic or repetitive 'missing information' claims if they are not paired with substantive alternative risk analysis.",
    "Penalize any side that uses precise numeric claims without source support or explicit hypothetical framing.",
    "Penalize citations that are weakly relevant to the proposal location/category or do not support the claimed numeric effect.",
    "Skeptic should win only when critique is stronger and evidence-grounded, not merely because it raises uncertainty.",
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
    "Deterministic proposal viability profile:",
    formatProposalViabilityProfile(proposalViability),
    "",
    "Debate history:",
    historyText,
    "",
    `Advocate statement: ${advocateStatement}`,
    `Skeptic statement: ${skepticStatement}`,
    "",
    "Scoring guidance:",
    "- Start from 0.5 and move only for clear quality differences.",
    "- Keep within [0.45, 0.55] when both statements are comparably strong or comparably weak.",
    "- Missing-evidence concerns alone should not dominate the score shift.",
    "- Treat clearly attributed proposal-stated numbers as valid but lower-confidence inputs.",
    "- Reward coherent downside sensitivity + mitigation planning.",
    "- Penalize introduced concrete facts that are not grounded in proposal/evidence/debate history.",
    "- Penalize unsupported assertions from either side equally.",
    "- Penalize uncited precise numeric claims from either side.",
    "- Penalize weakly relevant citations or citations that do not support the numeric claim being made.",
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
      temperature: 0.1,
      includeReasoning: false,
      reasoning: { effort: "low" },
    })
  );

  const rawScore = normalizeScore(parsed.score);
  const score = calibrateRoundScore({
    score: rawScore,
    rationale: parsed.rationale,
    advocateStatement,
    skepticStatement,
    proposalViability,
  });

  return {
    winner: deriveWinnerFromScore(score),
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
    "Apply equal skepticism to both sides in the round summaries; do not treat skeptical claims as true by default.",
    "Do not automatically penalize the advocate for every evidence gap if assumptions were explicit and reasonable.",
    "Treat clearly attributed proposal-stated numbers as admissible (lower confidence than external evidence, but not invalid by default).",
    "Reward coherent downside sensitivity framing and concrete mitigation controls.",
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
  const proposalViability = assessProposalViability(proposal);
  const evidence = await collectInternetEvidence(proposal);
  const evidenceText = formatEvidence(evidence);
  const realWorldDataPointsText = formatRealWorldDataPoints(evidence);
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
        realWorldDataPointsText,
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
        realWorldDataPointsText,
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
        realWorldDataPointsText,
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
        realWorldDataPointsText,
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
      proposalViability,
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
    proposalViability,
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

export const _scoringInternals = {
  countMissingInfoSignals,
  countUnsupportedNumericClaims,
  countProposalAttributionSignals,
  countScenarioSignals,
  countMitigationSignals,
  assessProposalViability,
  computeViabilityScoreAdjustment,
  computeStatementQualityScore,
  calibrateRoundScore,
  deriveWinnerFromScore,
};
