import { createBackendActor } from "../api/icp";
import { AuditLog, ContractRecord, Proposal } from "../types/api";

export interface SerializedProposalAIDebate {
  models: {
    advocate: string;
    skeptic: string;
    judge: string;
  };
  search_text: string;
  geo_hint_display_name: string | null;
  rounds: Array<{
    round: number;
    advocate_statement: string;
    skeptic_statement: string;
    winner: string;
    score: number;
    rationale: string;
  }>;
  aggregate_score: number;
  judge_reported_aggregate_score: number;
  funding_priority_score: number;
  funding_recommendation: string;
  rationale: string;
  criteria_ratings: {
    popularity: number;
    tourism_attendance: number;
    neglect_and_age: number;
    potential_tourism_benefit: number;
  };
  saved_at: number;
}

export interface SerializedProposal {
	id: string;
	submitter: string;
	creator: string; // Alias
	region_tag: string;
	title: string;
	description: string;
	short_description: string;
	problem_statement: string;
	category: string;
	budget_amount: number;
	funding_goal: number; // Alias
	budget_currency: string;
	budget_breakdown: string;
	executor_name: string;
	execution_plan: string;
	timeline: string;
	expected_impact: string;
	fairness_score: number;
	risk_flags: string[];
	status: string;
	created_at: number;
	updated_at: number;
	voting_ends_at: number;
	total_regional_vp: number;
	yes_weight: number;
	current_funding: number;
	no_weight: number;
	voter_count: number;
	location: {
		lat: number;
		lng: number;
		city: string;
		country: string;
		formatted_address: string;
	};
  ai_debate: SerializedProposalAIDebate | null;
}

export interface SerializedVote {
	voter: string;
	proposal_id: string;
	in_favor: boolean;
	weight: number;
	timestamp: number;
}

function parseVoteAuditLog(log: AuditLog): SerializedVote | null {
	const serialized = serializeAuditLog(log);
	if (serialized.event_type !== "VoteCast" || !serialized.proposal_id) {
		return null;
	}

	const match = serialized.payload.match(
		/^(yes|no) with Vp ([0-9]+(?:\.[0-9]+)?)/i,
	);
	if (!match) {
		return null;
	}

	return {
		voter: serialized.actor,
		proposal_id: serialized.proposal_id,
		in_favor: match[1]!.toLowerCase() === "yes",
		weight: Number(match[2]),
		timestamp: serialized.timestamp,
	};
}

// Map region tags to base coordinates
const REGION_COORDINATES: Record<
	string,
	{ lat: number; lng: number; country: string }
> = {
	sofia: { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
	sofia_urban: { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
	sofia_center: { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
	plovdiv: { lat: 42.1354, lng: 24.7453, country: "Bulgaria" },
	varna: { lat: 43.2141, lng: 27.9147, country: "Bulgaria" },
	burgas: { lat: 42.5048, lng: 27.4626, country: "Bulgaria" },
	nairobi: { lat: -1.2921, lng: 36.8219, country: "Kenya" },
	london: { lat: 51.5074, lng: -0.1278, country: "UK" },
	new_york: { lat: 40.7128, lng: -74.006, country: "USA" },
	global: { lat: 20.0, lng: 0.0, country: "Multiple" },
};

const regionLocationCache = new Map<
	string,
	Promise<SerializedProposal["location"]>
>();

/**
 * Deterministic jitter based on an ID (bigint)
 * Returns a value between -0.01 and 0.01
 */
function getJitter(id: bigint): number {
	return Number(id % BigInt(1000)) / 50000 - 0.01;
}

function normalizeLookupKey(value: string) {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");
}

async function geocodeRegionTag(regionTag: string) {
	try {
		const response = await fetch("/api/geocode", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ address: regionTag }),
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as {
			lat: number;
			lng: number;
			city: string;
			country: string;
			formattedAddress: string;
		};

		if (!data.lat || !data.lng) {
			return null;
		}

		return {
			lat: data.lat,
			lng: data.lng,
			city: data.city || regionTag,
			country: data.country || "Unknown Country",
			formatted_address: data.formattedAddress || regionTag,
		};
	} catch (error) {
		console.error(`Failed to geocode proposal region ${regionTag}:`, error);
		return null;
	}
}

async function resolveProposalLocation(
	proposal: Proposal,
): Promise<SerializedProposal["location"]> {
	const persistedLocation =
		proposal.location.length > 0 ? proposal.location[0]! : null;
	if (persistedLocation) {
		return persistedLocation;
	}

	const normalizedRegionKey = normalizeLookupKey(proposal.region_tag);
	const baseCoords =
		REGION_COORDINATES[normalizedRegionKey] ||
		REGION_COORDINATES["global"]!;

	if (REGION_COORDINATES[normalizedRegionKey]) {
		return {
			lat: baseCoords.lat + getJitter(proposal.id),
			lng: baseCoords.lng + getJitter(proposal.id + BigInt(1)),
			city: proposal.region_tag,
			country: baseCoords.country,
			formatted_address: `${proposal.region_tag}, ${baseCoords.country}`,
		};
	}

	const cacheKey = proposal.region_tag.trim();
	if (!regionLocationCache.has(cacheKey)) {
		regionLocationCache.set(
			cacheKey,
			(async () => {
				const geocoded = await geocodeRegionTag(cacheKey);
				if (geocoded) {
					return geocoded;
				}
				return {
					lat: baseCoords.lat + getJitter(proposal.id),
					lng: baseCoords.lng + getJitter(proposal.id + BigInt(1)),
					city: proposal.region_tag,
					country: baseCoords.country,
					formatted_address: `${proposal.region_tag}, ${baseCoords.country}`,
				};
			})(),
		);
	}

	return regionLocationCache.get(cacheKey)!;
}

async function serializeProposal(
	proposal: Proposal,
	totalRegionalVp: number = 0,
): Promise<SerializedProposal> {
	const statusKey = Object.keys(proposal.status)[0] || "Active";
	const budget =
		proposal.budget_amount.length > 0
			? Number(proposal.budget_amount[0])
			: 0;
	const yesWeight = proposal.yes_weight;
	const fairness =
		proposal.fairness_score.length > 0 ? proposal.fairness_score[0]! : 0;
	const currentFunding = statusKey === "Backed" ? budget : 0;
	const resolvedLocation = await resolveProposalLocation(proposal);
	const resolvedSnapshotVp =
		proposal.resolved_total_vp.length > 0
			? Number(proposal.resolved_total_vp[0]!)
			: null;
	const effectiveTotalRegionalVp = resolvedSnapshotVp ?? totalRegionalVp;

	return {
		id: proposal.id.toString(),
		submitter: proposal.submitter.toString(),
		creator: proposal.submitter.toString(),
		region_tag: proposal.region_tag,
		title: proposal.title,
		description: proposal.description,
		short_description: proposal.description.substring(0, 160),
		problem_statement: proposal.description,
		category:
			proposal.category.length > 0 && proposal.category[0]
				? Object.keys(proposal.category[0])[0]
				: "Other",
		budget_amount: budget,
		funding_goal: budget,
		budget_currency:
			proposal.budget_currency.length > 0
				? proposal.budget_currency[0]!
				: "USD",
		budget_breakdown:
			proposal.budget_breakdown.length > 0
				? proposal.budget_breakdown[0]!
				: "",
		executor_name:
			proposal.executor_name.length > 0 ? proposal.executor_name[0]! : "",
		execution_plan:
			proposal.execution_plan.length > 0
				? proposal.execution_plan[0]!
				: "",
		timeline: proposal.timeline.length > 0 ? proposal.timeline[0]! : "",
		expected_impact:
			proposal.expected_impact.length > 0
				? proposal.expected_impact[0]!
				: "",
		fairness_score: fairness,
		risk_flags: proposal.risk_flags || [],
		status: statusKey,
		created_at: Number(proposal.created_at),
		updated_at: Number(proposal.created_at),
		voting_ends_at: Number(proposal.voting_ends_at),
		total_regional_vp: effectiveTotalRegionalVp,
		yes_weight: yesWeight,
		current_funding: currentFunding,
		no_weight: proposal.no_weight,
		voter_count: proposal.voter_count,
		location: resolvedLocation,
    ai_debate: null,
	};
}

function serializeProposalAIDebate(
  debate: any,
): SerializedProposalAIDebate {
  return {
    models: {
      advocate: debate.models.advocate,
      skeptic: debate.models.skeptic,
      judge: debate.models.judge,
    },
    search_text: debate.search_text,
    geo_hint_display_name:
      debate.geo_hint_display_name.length > 0
        ? debate.geo_hint_display_name[0]!
        : null,
    rounds: (debate.rounds as any[]).map((round) => ({
      round: Number(round.round),
      advocate_statement: round.advocate_statement,
      skeptic_statement: round.skeptic_statement,
      winner: round.winner,
      score: Number(round.score),
      rationale: round.rationale,
    })),
    aggregate_score: Number(debate.aggregate_score),
    judge_reported_aggregate_score: Number(
      debate.judge_reported_aggregate_score,
    ),
    funding_priority_score: Number(debate.funding_priority_score),
    funding_recommendation: debate.funding_recommendation,
    rationale: debate.rationale,
    criteria_ratings: {
      popularity: Number(debate.criteria_ratings.popularity),
      tourism_attendance: Number(debate.criteria_ratings.tourism_attendance),
      neglect_and_age: Number(debate.criteria_ratings.neglect_and_age),
      potential_tourism_benefit: Number(
        debate.criteria_ratings.potential_tourism_benefit,
      ),
    },
    saved_at: Number(debate.saved_at),
  };
}

async function loadRegionVotingPowerMap(
	actor: Awaited<ReturnType<typeof createBackendActor>>,
	proposals: Proposal[],
) {
	const uniqueRegions = Array.from(
		new Set(
			proposals.map((proposal) => proposal.region_tag).filter(Boolean),
		),
	);
	const entries = await Promise.all(
		uniqueRegions.map(async (region) => {
			try {
				const totalVp = await actor.get_region_total_vp(region);
				return [region, Number(totalVp)] as const;
			} catch (error) {
				console.error(
					`Failed to fetch regional VP for ${region}:`,
					error,
				);
				return [region, 0] as const;
			}
		}),
	);

	return new Map(entries);
}

async function serializeProposalCollection(
	actor: Awaited<ReturnType<typeof createBackendActor>>,
	proposals: Proposal[],
) {
	const regionVotingPowerMap = await loadRegionVotingPowerMap(
		actor,
		proposals,
	);
	return Promise.all(
		proposals.map((proposal) =>
			serializeProposal(
				proposal,
				regionVotingPowerMap.get(proposal.region_tag) ?? 0,
			),
		),
	);
}

export async function fetchAllProposals(status?: string) {
	try {
		const actor = await createBackendActor();
		const proposals = await actor.list_proposals(
			status ? [{ [status]: null } as any] : [],
		);
		return {
			success: true,
			proposals: await serializeProposalCollection(actor, proposals),
		};
	} catch (error) {
		console.error("Failed to fetch proposals:", error);
		return { success: false, proposals: [] };
	}
}

export async function fetchMyProposals(principal: string | null | undefined) {
	try {
		if (!principal) {
			return { success: true, proposals: [] };
		}

		const actor = await createBackendActor();
		const proposals = await actor.list_proposals([]);
		const filtered = proposals.filter(
			(p) => p.submitter.toString() === principal,
		);
		return {
			success: true,
			proposals: await serializeProposalCollection(actor, filtered),
		};
	} catch (error) {
		return { success: false, proposals: [] };
	}
}

export async function fetchProposalById(id: string) {
	if (isNaN(Number(id))) return { success: false, error: "Invalid ID" };
	try {
		const actor = await createBackendActor();
    const [result, debateResult] = await Promise.all([
      actor.get_proposal(BigInt(id)),
      (actor as any).get_proposal_ai_debate(BigInt(id)),
    ]);

		if (result.length > 0) {
			const proposal = result[0]!;
			let totalRegionalVp = 0;

			if (proposal.resolved_total_vp.length === 0) {
				try {
					totalRegionalVp = Number(
						await actor.get_region_total_vp(proposal.region_tag),
					);
				} catch (error) {
					console.error(
						`Failed to fetch regional VP for ${proposal.region_tag}:`,
						error,
					);
				}
			}

			return {
				success: true,
				proposal: {
          ...(await serializeProposal(proposal, totalRegionalVp)),
          ai_debate:
            debateResult && debateResult.length > 0
              ? serializeProposalAIDebate(debateResult[0]!)
              : null,
        },
			};
		}
		return { success: false, error: "Not found" };
	} catch (error) {
    console.error("Error fetching proposal:", error);
		return { success: false, error: "Error fetching proposal" };
	}
}

export async function fetchProposalVotes(id: string) {
	try {
		const actor = await createBackendActor();
		const votes = await actor.get_proposal_votes(BigInt(id));
		if (votes.length === 0) {
			const auditLogs = await actor.get_audit_log(500, 0);
			const reconstructedVotes = auditLogs
				.map(parseVoteAuditLog)
				.filter((vote): vote is SerializedVote =>
					Boolean(vote && vote.proposal_id === id),
				)
				.sort((left, right) => right.timestamp - left.timestamp);

			return {
				success: true,
				votes: reconstructedVotes,
			};
		}

		return {
			success: true,
			votes: votes.map(
				(v): SerializedVote => ({
					...v,
					voter: v.voter.toString(),
					proposal_id: v.proposal_id.toString(),
					weight: Number(v.weight),
					timestamp: Number(v.timestamp),
				}),
			),
		};
	} catch (error) {
		console.error("Failed to fetch votes:", error);
		return { success: false, votes: [] };
	}
}

export async function fetchAuditLogs(limit: number = 50, offset: number = 0) {
	try {
		const actor = await createBackendActor();
		const logs = await actor.get_audit_log(limit, offset);
		return { success: true, logs: logs.map(serializeAuditLog) };
	} catch (error) {
		console.error("fetchAuditLogs error:", error);
		return { success: false, logs: [] };
	}
}

export async function fetchAllContracts(status?: string) {
	try {
		const actor = await createBackendActor();
		const contracts = await actor.list_contracts(
			status ? [{ [status]: null } as any] : [],
		);
		return { success: true, contracts: contracts.map(serializeContract) };
	} catch (error) {
		return { success: false, contracts: [] };
	}
}

export async function fetchContractById(id: string) {
	if (isNaN(Number(id))) return { success: false, error: "Invalid ID" };
	try {
		const actor = await createBackendActor();
		const result = await actor.get_contract_record(BigInt(id));
		if (result.length > 0)
			return { success: true, contract: serializeContract(result[0]!) };
		return { success: false, error: "Contract not found" };
	} catch (error) {
		return { success: false, error: "Error fetching contract" };
	}
}

export async function fetchConfig() {
	try {
		const actor = await createBackendActor();
		const config = await actor.get_config();
		return {
			success: true,
			config: {
				...config,
				voting_period_ns: Number(config.voting_period_ns),
			},
		};
	} catch (error) {
		return { success: false, error: "Failed to fetch config" };
	}
}

export async function fetchGlobalStats() {
	try {
		const actor = await createBackendActor();
		const proposals = await actor.list_proposals([]);

		const total_funded = proposals.reduce(
			(acc, p) =>
				acc +
				Number(p.budget_amount.length > 0 ? p.budget_amount[0] : 0),
			0,
		);
		const active_projects = proposals.filter(
			(p) => "Active" in p.status,
		).length;

		const fairness_scores = proposals
			.filter((p) => p.fairness_score.length > 0)
			.map((p) => p.fairness_score[0]!);

		const average_ai_integrity_score =
			fairness_scores.length > 0
				? Math.round(
						fairness_scores.reduce((a, b) => a + b, 0) /
							fairness_scores.length,
					)
				: 88;

		return {
			success: true,
			stats: {
				total_funded,
				active_projects,
				verified_users: 12400,
				average_ai_integrity_score,
			},
		};
	} catch (error) {
		console.error("Failed to fetch global stats:", error);
		return { success: false, error: "Failed to load platform statistics." };
	}
}

export interface SerializedAuditLog {
	id: string;
	timestamp: number;
	actor: string;
	event_type: string;
	proposal_id: string | null;
	payload: string;
}

function serializeAuditLog(log: AuditLog): SerializedAuditLog {
	return {
		id: log.id.toString(),
		timestamp: Number(log.timestamp),
		actor: log.actor.toString(),
		event_type:
			typeof log.event_type === "string"
				? log.event_type
				: Object.keys(log.event_type)[0],
		proposal_id:
			log.proposal_id.length > 0 ? log.proposal_id[0]!.toString() : null,
		payload: log.payload,
	};
}

export interface SerializedContract {
	proposal_id: string;
	created_by: string;
	investor: string;
	company_name: string;
	status: string;
	created_at: number;
	updated_at: number;
	document_uri: string;
}

function serializeContract(c: ContractRecord): SerializedContract {
	return {
		proposal_id: c.proposal_id.toString(),
		created_by: c.created_by.toString(),
		investor: c.investor_principal.toString(),
		company_name: c.company.legal_name,
		status: Object.keys(c.status)[0],
		created_at: Number(c.created_at),
		updated_at: Number(c.updated_at),
		document_uri: c.document_uri,
	};
}
