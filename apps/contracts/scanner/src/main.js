import "./styles.css";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { idlFactory } from "./icp_proposals_idl.js";

const DEFAULT_CANISTER_ID = "sk6yb-aqaaa-aaaad-qljxa-cai";
const urlParams = new URLSearchParams(window.location.search);
const envNetwork = (import.meta.env.DFX_NETWORK ?? "ic").replaceAll("'", "");
const canisterId =
  urlParams.get("canister") ??
  import.meta.env.CANISTER_ID_ICP_PROPOSALS_MVP ??
  DEFAULT_CANISTER_ID;
const host =
  urlParams.get("host") ??
  (envNetwork === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943");
const isLocal = /127\.0\.0\.1|localhost/.test(host);
const networkLabel = isLocal ? "Local replica" : "ICP mainnet";
const encoder = new TextEncoder();
const statusFilters = [
  "All",
  "Active",
  "AwaitingFunding",
  "Backed",
  "Signed",
  "Rejected",
  "QuorumNotMet",
];
const QUORUM_PERCENT_OF_TOTAL = 5;
const ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL = 51;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function variantKey(variant) {
  return variant ? Object.keys(variant)[0] : "Unknown";
}

function optionValue(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function principalText(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toText?.() ?? String(value);
}

function shorten(value, head = 8, tail = 6) {
  if (!value) return "Unassigned";
  const text = String(value);
  if (text.length <= head + tail + 1) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

function formatDate(ns) {
  if (!ns) return "Unknown";
  const millis = Number(BigInt(ns) / 1_000_000n);
  return new Date(millis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelative(ns) {
  if (!ns) return "Unknown";
  const millis = Number(BigInt(ns) / 1_000_000n);
  const diffMs = Date.now() - millis;
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  if (absSeconds < 60) return diffMs >= 0 ? "just now" : "in seconds";
  if (absSeconds < 3600) {
    const minutes = Math.round(absSeconds / 60);
    return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }
  if (absSeconds < 86400) {
    const hours = Math.round(absSeconds / 3600);
    return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  }
  const days = Math.round(absSeconds / 86400);
  return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
}

function formatAmount(amount, currency) {
  if (amount == null) return "Not set";
  const code = currency || "EUR";
  return `${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${code}`;
}

function formatPercent(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMetricPercent(value, digits = 0) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safeValue.toFixed(digits)}%`;
}

function countdown(endNs) {
  if (!endNs) return "Unknown";
  const diff = BigInt(endNs) - BigInt(Date.now()) * 1_000_000n;
  if (diff <= 0n) return "Voting ended";
  const totalSeconds = Number(diff / 1_000_000_000n);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function humanizeLabel(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ");
}

function normalizeProposal(proposal) {
  return {
    id: proposal.id,
    idText: proposal.id.toString(),
    title: proposal.title,
    description: proposal.description,
    submitter: principalText(proposal.submitter),
    region: proposal.region_tag,
    category: optionValue(proposal.category)
      ? variantKey(optionValue(proposal.category))
      : "Other",
    budgetAmount: optionValue(proposal.budget_amount),
    budgetCurrency: optionValue(proposal.budget_currency),
    budgetBreakdown: optionValue(proposal.budget_breakdown),
    executorName: optionValue(proposal.executor_name),
    executionPlan: optionValue(proposal.execution_plan),
    timeline: optionValue(proposal.timeline),
    expectedImpact: optionValue(proposal.expected_impact),
    fairnessScore: optionValue(proposal.fairness_score),
    riskFlags: proposal.risk_flags ?? [],
    backedBy: principalText(optionValue(proposal.backed_by)),
    backedAt: optionValue(proposal.backed_at),
    resolvedTotalVp: optionValue(proposal.resolved_total_vp),
    status: variantKey(proposal.status),
    createdAt: proposal.created_at,
    votingEndsAt: proposal.voting_ends_at,
    yesWeight: proposal.yes_weight,
    noWeight: proposal.no_weight,
    voterCount: proposal.voter_count,
  };
}

function normalizeContract(contract) {
  return {
    proposalId: contract.proposal_id.toString(),
    createdBy: principalText(contract.created_by),
    investorPrincipal: principalText(contract.investor_principal),
    company: {
      legalName: contract.company.legal_name,
      registrationId: contract.company.registration_id,
      representativeName: contract.company.representative_name,
      representativePrincipal: principalText(
        optionValue(contract.company.representative_principal),
      ),
    },
    documentHash: contract.document_hash,
    documentUri: contract.document_uri,
    milestoneHash: optionValue(contract.milestone_hash),
    signatureMode: variantKey(contract.signature_mode),
    externalProvider: optionValue(contract.external_provider),
    externalEnvelopeId: optionValue(contract.external_envelope_id),
    investorAckAt: optionValue(contract.investor_ack_at),
    companyAckAt: optionValue(contract.company_ack_at),
    externalSignedAt: optionValue(contract.external_signed_at),
    status: variantKey(contract.status),
    createdAt: contract.created_at,
    updatedAt: contract.updated_at,
  };
}

function normalizePhase(result) {
  if (!result || !("Ok" in result)) return null;
  return {
    proposalId: result.Ok.proposal_id.toString(),
    proposalStatus: variantKey(result.Ok.proposal_status),
    contractStatus: optionValue(result.Ok.contract_status)
      ? variantKey(optionValue(result.Ok.contract_status))
      : null,
    phaseLabel: result.Ok.phase_label,
  };
}

function normalizeVote(vote) {
  return {
    voter: principalText(vote.voter),
    proposalId: vote.proposal_id.toString(),
    inFavor: vote.in_favor,
    weight: vote.weight,
    timestamp: vote.timestamp,
  };
}

function normalizeAudit(event) {
  return {
    id: event.id.toString(),
    actor: principalText(event.actor),
    proposalId: optionValue(event.proposal_id)?.toString() ?? null,
    timestamp: event.timestamp,
    eventType: variantKey(event.event_type),
    payload: event.payload,
  };
}

function getProposalVotingMetrics(proposal, totalRegionalVp) {
  const yesWeight = proposal.yesWeight ?? 0;
  const noWeight = proposal.noWeight ?? 0;
  const totalCastWeight = yesWeight + noWeight;
  const leadingWeight = Math.max(yesWeight, noWeight);

  return {
    yesWeight,
    noWeight,
    totalCastWeight,
    totalRegionalVp,
    supportPercent: totalRegionalVp > 0 ? (yesWeight / totalRegionalVp) * 100 : 0,
    oppositionPercent: totalRegionalVp > 0 ? (noWeight / totalRegionalVp) * 100 : 0,
    turnoutPercent:
      totalRegionalVp > 0 ? (totalCastWeight / totalRegionalVp) * 100 : 0,
    leadingPercentOfRegion:
      totalRegionalVp > 0 ? (leadingWeight / totalRegionalVp) * 100 : 0,
    supportShareOfCastPercent:
      totalCastWeight > 0 ? (yesWeight / totalCastWeight) * 100 : 0,
    hasVotes: totalCastWeight > 0,
  };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function createFingerprints(proposals, phases, contracts, auditByProposal) {
  const records = await Promise.all(
    proposals.map(async (proposal) => {
      const phase = phases.get(proposal.idText);
      const contract = contracts.get(proposal.idText);
      const auditTrail = auditByProposal.get(proposal.idText) ?? [];
      const canonical = JSON.stringify({
        id: proposal.idText,
        title: proposal.title,
        submitter: proposal.submitter,
        createdAt: proposal.createdAt.toString(),
        status: proposal.status,
        yesWeight: proposal.yesWeight,
        noWeight: proposal.noWeight,
        region: proposal.region,
        phase: phase?.phaseLabel ?? null,
        contractHash: contract?.documentHash ?? null,
        auditCount: auditTrail.length,
      });
      return [proposal.idText, await sha256Hex(canonical)];
    }),
  );

  return new Map(records);
}

async function createActor() {
  const agent = await HttpAgent.create({ host });
  if (isLocal) {
    await agent.fetchRootKey();
  }
  return Actor.createActor(idlFactory, { agent, canisterId });
}

class ScannerApp {
  constructor(root) {
    this.root = root;
    this.state = {
      actor: null,
      loading: true,
      refreshing: false,
      error: "",
      selectedId: null,
      lastSync: null,
      search: "",
      filter: "All",
      config: null,
      proposals: [],
      contracts: new Map(),
      phases: new Map(),
      regionVp: new Map(),
      auditEvents: [],
      auditByProposal: new Map(),
      votesByProposal: new Map(),
      voteLoadingId: null,
      fingerprints: new Map(),
      scanRoot: null,
      copiedValue: "",
    };

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.state.selectedId) {
        this.state.selectedId = null;
        this.render();
      }
    });

    this.loadData();
  }

  async loadData(isRefresh = false) {
    if (isRefresh) {
      this.state.refreshing = true;
      this.state.error = "";
      this.render();
    }

    try {
      const actor = this.state.actor ?? (await createActor());
      const [config, rawProposals, rawContracts, rawAudit] = await Promise.all([
        actor.get_config(),
        actor.list_proposals([]),
        actor.list_contracts([]),
        actor.get_audit_log(80, 0),
      ]);

      const proposals = rawProposals
        .map(normalizeProposal)
        .sort((left, right) => Number(right.id - left.id));
      const contracts = new Map(
        rawContracts.map((contract) => {
          const normalized = normalizeContract(contract);
          return [normalized.proposalId, normalized];
        }),
      );
      const auditEvents = rawAudit.map(normalizeAudit);
      const auditByProposal = auditEvents.reduce((groups, event) => {
        if (!event.proposalId) return groups;
        const existing = groups.get(event.proposalId) ?? [];
        existing.push(event);
        groups.set(event.proposalId, existing);
        return groups;
      }, new Map());

      const phasePairs = await Promise.all(
        proposals.map(async (proposal) => {
          const result = await actor.get_proposal_phase(proposal.id);
          return [proposal.idText, normalizePhase(result)];
        }),
      );
      const phases = new Map(phasePairs);

      const regionNames = [...new Set(proposals.map((proposal) => proposal.region))];
      const regionVp = new Map(
        await Promise.all(
          regionNames.map(async (region) => [region, await actor.get_region_total_vp(region)]),
        ),
      );

      const votePairs = await Promise.all(
        proposals.map(async (proposal) => {
          const votes = await actor.get_proposal_votes(proposal.id);
          return [
            proposal.idText,
            votes
              .map(normalizeVote)
              .sort((left, right) => Number(BigInt(right.timestamp) - BigInt(left.timestamp))),
          ];
        }),
      );
      const votesByProposal = new Map(votePairs);

      const fingerprints = await createFingerprints(
        proposals,
        phases,
        contracts,
        auditByProposal,
      );
      const scanRoot = await sha256Hex(
        JSON.stringify(
          [...fingerprints.entries()].sort((left, right) =>
            left[0].localeCompare(right[0]),
          ),
        ),
      );

      this.state = {
        ...this.state,
        actor,
        loading: false,
        refreshing: false,
        config,
        proposals,
        contracts,
        phases,
        regionVp,
        auditEvents,
        auditByProposal,
        votesByProposal,
        fingerprints,
        scanRoot,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      this.state = {
        ...this.state,
        loading: false,
        refreshing: false,
        error: error.message || String(error),
      };
    }

    this.render();
  }

  async loadVotes(proposalId) {
    if (!this.state.actor || this.state.votesByProposal.has(proposalId)) return;

    this.state.voteLoadingId = proposalId;
    this.render();

    try {
      const votes = await this.state.actor.get_proposal_votes(BigInt(proposalId));
      this.state.votesByProposal.set(
        proposalId,
        votes
          .map(normalizeVote)
          .sort((left, right) => Number(BigInt(right.timestamp) - BigInt(left.timestamp))),
      );
    } catch (error) {
      this.state.error = error.message || String(error);
    }

    this.state.voteLoadingId = null;
    this.render();
  }

  handleClick(event) {
    const closeButton = event.target.closest("[data-close-sheet]");
    if (closeButton) {
      this.state.selectedId = null;
      this.render();
      return;
    }

    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      this.state.filter = filterButton.dataset.filter;
      this.render();
      return;
    }

    const refreshButton = event.target.closest("[data-refresh]");
    if (refreshButton) {
      this.loadData(true);
      return;
    }

    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      const text = copyButton.dataset.copy;
      if (text) {
        navigator.clipboard.writeText(text).catch(() => {});
        this.state.copiedValue = text;
        this.render();
        window.setTimeout(() => {
          if (this.state.copiedValue === text) {
            this.state.copiedValue = "";
            this.render();
          }
        }, 1400);
      }
      return;
    }

    const openButton = event.target.closest("[data-open-proposal]");
    if (openButton) {
      const proposalId = openButton.dataset.openProposal;
      this.state.selectedId = proposalId;
      this.render();
      this.loadVotes(proposalId);
    }
  }

  handleInput(event) {
    const searchField = event.target.closest("[data-search]");
    if (searchField) {
      this.state.search = searchField.value;
      this.render();
    }
  }

  getVisibleProposals() {
    const query = this.state.search.trim().toLowerCase();
    return this.state.proposals.filter((proposal) => {
      const contract = this.state.contracts.get(proposal.idText);
      const statusMatch =
        this.state.filter === "All" ||
        proposal.status === this.state.filter ||
        (this.state.filter === "Signed" && contract?.status === "Signed");
      if (!statusMatch) return false;
      if (!query) return true;
      const haystack = [
        proposal.title,
        proposal.description,
        proposal.region,
        proposal.submitter,
        proposal.category,
        proposal.executorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  getSelectedContext() {
    if (!this.state.selectedId) return null;
    const proposal = this.state.proposals.find(
      (item) => item.idText === this.state.selectedId,
    );
    if (!proposal) return null;
    return {
      proposal,
      contract: this.state.contracts.get(proposal.idText) ?? null,
      phase: this.state.phases.get(proposal.idText) ?? null,
      fingerprint: this.state.fingerprints.get(proposal.idText) ?? null,
      votes: this.state.votesByProposal.get(proposal.idText) ?? [],
      auditTrail: this.state.auditByProposal.get(proposal.idText) ?? [],
      totalRegionVp: this.state.regionVp.get(proposal.region) ?? 0,
    };
  }

  renderStatusPill(label) {
    return `<span class="status-pill status-pill--${escapeHtml(
      label.toLowerCase(),
    )}">${escapeHtml(humanizeLabel(label))}</span>`;
  }

  renderSummaryCards() {
    const { proposals, contracts, auditEvents, config, lastSync } = this.state;
    const active = proposals.filter((proposal) => proposal.status === "Active").length;
    const awaitingFunding = proposals.filter(
      (proposal) => proposal.status === "AwaitingFunding",
    ).length;
    const signedContracts = [...contracts.values()].filter(
      (contract) => contract.status === "Signed",
    ).length;
    const votingWindowMinutes = config
      ? Math.round(Number(config.voting_period_ns / 1_000_000_000n) / 60)
      : null;
    const totalVotes = [...this.state.votesByProposal.values()].reduce(
      (sum, votes) => sum + votes.length,
      0,
    );

    return `
      <section class="chain-board">
        <div class="chain-board__top">
          <div class="chain-brand">
            <div class="brand-mark">OF</div>
            <div>
              <p class="brand-kicker">OpenFairTrip Scanner</p>
              <code class="brand-hash">${escapeHtml(
                this.state.scanRoot
                  ? shorten(this.state.scanRoot, 16, 12)
                  : "building-root",
              )}</code>
            </div>
          </div>

          <button class="refresh-button" data-refresh>
            ${this.state.refreshing ? "..." : "Refresh"}
          </button>
        </div>

        <div class="chain-grid">
          <article class="chain-box">
            <span>Canister</span>
            <code>${escapeHtml(shorten(canisterId, 13, 9))}</code>
          </article>
          <article class="chain-box">
            <span>Network</span>
            <strong>${escapeHtml(networkLabel)}</strong>
          </article>
          <article class="chain-box">
            <span>Proposals</span>
            <strong>${proposals.length}</strong>
          </article>
          <article class="chain-box">
            <span>Votes</span>
            <strong>${totalVotes}</strong>
          </article>
          <article class="chain-box">
            <span>Awaiting</span>
            <strong>${awaitingFunding}</strong>
          </article>
          <article class="chain-box">
            <span>Signed</span>
            <strong>${signedContracts}</strong>
          </article>
        </div>

        <div class="chain-ticker">
          <span class="ticker-chip">${active} live</span>
          <span class="ticker-chip">${pluralize(auditEvents.length, "audit", "audits")}</span>
          ${
            votingWindowMinutes
              ? `<span class="ticker-chip">${votingWindowMinutes}m window</span>`
              : ""
          }
          ${
            config
              ? `<span class="ticker-chip">${formatPercent(
                  config.quorum_percent,
                )} quorum / ${formatPercent(config.majority_threshold)} yes</span>`
              : ""
          }
          <span class="ticker-chip">
            sync ${escapeHtml(
              lastSync
                ? formatRelative(BigInt(Date.parse(lastSync)) * 1_000_000n)
                : "pending",
            )}
          </span>
        </div>
      </section>
    `;
  }

  renderControls() {
    return `
      <section class="controls-panel">
        <label class="search-field search-field--compact">
          <input
            data-search
            type="search"
            placeholder="hash / title / principal / region"
            value="${escapeHtml(this.state.search)}"
          />
        </label>

        <div class="filter-row">
          ${statusFilters
            .map(
              (filter) => `
                <button
                  class="filter-chip ${filter === this.state.filter ? "is-active" : ""}"
                  data-filter="${escapeHtml(filter)}"
                >
                  ${escapeHtml(humanizeLabel(filter))}
                </button>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  renderVotePreview(votes) {
    if (!votes.length) {
      return `<span class="vote-chip vote-chip--empty">No votes</span>`;
    }

    return votes
      .map(
        (vote) => `
          <span class="vote-chip vote-chip--${vote.inFavor ? "yes" : "no"}">
            ${vote.inFavor ? "YES" : "NO"} ${vote.weight.toFixed(2)} VP · ${escapeHtml(
              shorten(vote.voter, 9, 6),
            )}
          </span>
        `,
      )
      .join("");
  }

  renderProposalCard(proposal) {
    const phase = this.state.phases.get(proposal.idText);
    const contract = this.state.contracts.get(proposal.idText);
    const votes = this.state.votesByProposal.get(proposal.idText) ?? [];
    const fingerprint = this.state.fingerprints.get(proposal.idText) ?? "pending";
    const regionTotalVp =
      proposal.resolvedTotalVp ?? (this.state.regionVp.get(proposal.region) ?? 0);
    const metrics = getProposalVotingMetrics(proposal, regionTotalVp);
    const anchorHash = contract?.documentHash ?? fingerprint;
    const isPassedStatus =
      proposal.status === "AwaitingFunding" || proposal.status === "Backed";
    const isResolvedWithQuorum = isPassedStatus || proposal.status === "Rejected";
    const quorumReached =
      metrics.turnoutPercent >= QUORUM_PERCENT_OF_TOTAL || isResolvedWithQuorum;
    const approvalReached =
      metrics.supportPercent >= ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL;
    const approvalRulePassed = approvalReached || isPassedStatus;
    const passedByDeadlineMajority =
      isPassedStatus &&
      metrics.supportPercent < ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL &&
      metrics.supportShareOfCastPercent >= 50;
    const supportLabel = metrics.totalRegionalVp > 0
      ? `${metrics.yesWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} yes VP`
      : `${metrics.yesWeight.toFixed(1)} yes VP`;
    const oppositionLabel = metrics.totalRegionalVp > 0
      ? `${metrics.noWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} no VP`
      : `${metrics.noWeight.toFixed(1)} no VP`;
    const turnoutLabel = metrics.totalRegionalVp > 0
      ? `${metrics.totalCastWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} VP`
      : `${metrics.totalCastWeight.toFixed(1)} VP cast`;

    return `
      <article class="proposal-card" data-open-proposal="${proposal.idText}">
        <div class="proposal-card__hero">
          <div class="proposal-card__header">
            <div class="status-row">
              <span class="proposal-id">#${escapeHtml(proposal.idText)}</span>
              ${this.renderStatusPill(proposal.status)}
            </div>
            <code class="fingerprint-inline">${escapeHtml(shorten(anchorHash, 12, 10))}</code>
          </div>

          <h3>${escapeHtml(proposal.title)}</h3>
          <p class="card-caption">${escapeHtml(phase?.phaseLabel ?? humanizeLabel(proposal.status))}</p>

          <div class="tag-row">
            <span class="tag-chip">${escapeHtml(proposal.region)}</span>
            <span class="tag-chip">${escapeHtml(proposal.category)}</span>
            ${contract ? `<span class="tag-chip">contract</span>` : ""}
          </div>
        </div>

        <section class="governance-panel">
          <div class="governance-panel__head">
            <div>
              <h4>Governance Status</h4>
              <p>${escapeHtml(humanizeLabel(proposal.status))}</p>
            </div>
          </div>

          <div class="governance-metrics">
            <article class="governance-metric governance-metric--yes">
              <span>Yes of total VP</span>
              <strong>${formatMetricPercent(metrics.supportPercent, 1)}</strong>
              <small>${escapeHtml(metrics.hasVotes ? supportLabel : "0.0 yes VP")}</small>
            </article>
            <article class="governance-metric governance-metric--no">
              <span>No of total VP</span>
              <strong>${formatMetricPercent(metrics.oppositionPercent, 1)}</strong>
              <small>${escapeHtml(metrics.hasVotes ? oppositionLabel : "0.0 no VP")}</small>
            </article>
          </div>

          <div class="vote-meter" aria-hidden="true">
            <div class="vote-meter__bar">
              <span class="vote-meter__yes" style="width:${Math.min(metrics.supportPercent, 100)}%"></span>
              <span class="vote-meter__no" style="width:${Math.min(metrics.oppositionPercent, 100)}%"></span>
            </div>
            <span class="vote-meter__marker" style="left:${QUORUM_PERCENT_OF_TOTAL}%">
              <span>${QUORUM_PERCENT_OF_TOTAL}%</span>
            </span>
            <span class="vote-meter__marker" style="left:${ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}%">
              <span>${ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}%</span>
            </span>
          </div>

          <div class="governance-rules">
            <article class="governance-rule">
              <span class="governance-rule__icon ${quorumReached ? "is-met" : ""}"></span>
              <div>
                <strong>Quorum: at least ${QUORUM_PERCENT_OF_TOTAL}% of eligible VP has voted</strong>
                <small>${formatMetricPercent(metrics.turnoutPercent, 1)} turnout so far</small>
              </div>
            </article>
            <article class="governance-rule">
              <span class="governance-rule__icon ${approvalRulePassed ? "is-met" : ""}"></span>
              <div>
                <strong>Passes automatically at ${ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}% Yes VP, or by majority after time ends</strong>
                <small>${
                  escapeHtml(
                    passedByDeadlineMajority
                      ? `Approved after deadline with ${formatMetricPercent(
                          metrics.supportShareOfCastPercent,
                          1,
                        )} Yes share of cast VP`
                      : `${formatMetricPercent(
                          metrics.supportPercent,
                          1,
                        )} Yes of total eligible VP`,
                  )
                }</small>
              </div>
            </article>
          </div>

          <div class="governance-summary">
            <article>
              <span>Turnout</span>
              <strong>${formatMetricPercent(metrics.turnoutPercent, 1)}</strong>
              <small>${escapeHtml(turnoutLabel)}</small>
            </article>
            <article>
              <span>Yes / No</span>
              <strong>${metrics.yesWeight.toFixed(1)} / ${metrics.noWeight.toFixed(1)}</strong>
              <small>${proposal.voterCount} voters</small>
            </article>
          </div>
        </section>

        <section class="ledger-snapshot">
          <div class="ledger-snapshot__grid">
            <div class="hash-line">
              <span>proposal</span>
              <code>${escapeHtml(shorten(fingerprint, 18, 14))}</code>
            </div>
            ${
              contract
                ? `<div class="hash-line"><span>contract</span><code>${escapeHtml(
                    shorten(contract.documentHash, 18, 14),
                  )}</code></div>`
                : ""
            }
            <div class="hash-line">
              <span>submitter</span>
              <code>${escapeHtml(shorten(proposal.submitter, 12, 8))}</code>
            </div>
            <div class="hash-line">
              <span>budget</span>
              <code>${escapeHtml(
                formatAmount(proposal.budgetAmount, proposal.budgetCurrency),
              )}</code>
            </div>
          </div>

          <div class="proposal-card__footer">
            <div class="proposal-card__votes">
              <span class="vote-strip-label">Who voted</span>
              <div class="proof-cluster vote-strip">
                ${this.renderVotePreview(votes)}
              </div>
            </div>
            <span class="meta-inline">${escapeHtml(formatRelative(proposal.createdAt))}</span>
          </div>
        </section>

        ${
          proposal.status === "Active"
            ? `<div class="live-ribbon">Live window: ${escapeHtml(countdown(proposal.votingEndsAt))}</div>`
            : ""
        }
      </article>
    `;
  }

  renderFeed() {
    const proposals = this.getVisibleProposals();
    if (!proposals.length) {
      return `
        <section class="empty-state">
          <p class="eyebrow">No match</p>
          <h2>No records in this slice</h2>
        </section>
      `;
    }

    return `
      <section class="feed-grid">
        ${proposals.map((proposal) => this.renderProposalCard(proposal)).join("")}
      </section>
    `;
  }

  renderTimeline(events) {
    if (!events.length) {
      return `<p class="section-empty">No audit events were returned for this proposal in the recent slice.</p>`;
    }

    return `
      <div class="timeline">
        ${events
          .map(
            (event) => `
              <article class="timeline-item">
                <div class="timeline-pin"></div>
                <div class="timeline-copy">
                  <div class="timeline-topline">
                    <strong>${escapeHtml(humanizeLabel(event.eventType))}</strong>
                    <span>${escapeHtml(formatDate(event.timestamp))}</span>
                  </div>
                  <p>${escapeHtml(event.payload)}</p>
                  <code>${escapeHtml(shorten(event.actor, 10, 8))}</code>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  renderVotes(votes, isLoading) {
    if (isLoading) {
      return `<p class="section-empty">Loading vote weights...</p>`;
    }
    if (!votes.length) {
      return `<p class="section-empty">No vote records returned for this proposal.</p>`;
    }

    return `
      <div class="vote-list">
        ${votes
          .map(
            (vote) => `
              <article class="vote-row">
                <div>
                  <strong>${escapeHtml(vote.inFavor ? "Yes" : "No")}</strong>
                  <p>${escapeHtml(shorten(vote.voter, 12, 8))}</p>
                </div>
                <div class="vote-meta">
                  <strong>${vote.weight.toFixed(2)} VP</strong>
                  <span>${escapeHtml(formatDate(vote.timestamp))}</span>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  renderDetailSheet() {
    const selected = this.getSelectedContext();
    if (!selected) {
      return "";
    }

    const { proposal, contract, phase, fingerprint, votes, auditTrail, totalRegionVp } =
      selected;
    const effectiveTotalRegionVp = proposal.resolvedTotalVp ?? totalRegionVp;
    const metrics = getProposalVotingMetrics(proposal, effectiveTotalRegionVp);
    const anchorHash = contract?.documentHash ?? fingerprint ?? "pending";

    return `
      <div class="sheet-backdrop is-open" data-close-sheet></div>
      <aside class="detail-sheet is-open">
        <div class="detail-sheet__header">
          <div>
            <p class="eyebrow">Proposal #${escapeHtml(proposal.idText)}</p>
            <h2>${escapeHtml(proposal.title)}</h2>
            <p class="sheet-copy">${escapeHtml(
              phase?.phaseLabel ?? humanizeLabel(proposal.status),
            )}</p>
          </div>
          <button class="sheet-close" type="button" data-close-sheet>Close</button>
        </div>

        <div class="detail-status-row">
          ${this.renderStatusPill(proposal.status)}
          ${contract ? this.renderStatusPill(contract.status) : ""}
          <span class="tag-chip">${escapeHtml(proposal.region)}</span>
          <span class="tag-chip">${escapeHtml(proposal.category)}</span>
        </div>

        <section class="detail-block detail-block--proof">
          <div class="proof-header">
            <div>
              <p class="eyebrow">Hashes</p>
              <h3>Proposal + contract anchors</h3>
            </div>
            <button class="copy-button" type="button" data-copy="${escapeHtml(anchorHash)}">
              ${this.state.copiedValue === anchorHash ? "Copied" : "Copy hash"}
            </button>
          </div>

          <div class="proof-grid">
            <article>
              <span>Scanner fingerprint</span>
              <code>${escapeHtml(fingerprint ?? "Pending")}</code>
            </article>
            <article>
              <span>Anchor hash</span>
              <code>${escapeHtml(anchorHash)}</code>
            </article>
            <article>
              <span>Submitter principal</span>
              <code>${escapeHtml(proposal.submitter)}</code>
            </article>
            <article>
              <span>Backer principal</span>
              <code>${escapeHtml(contract?.investorPrincipal ?? proposal.backedBy ?? "Not backed")}</code>
            </article>
          </div>
        </section>

        <section class="detail-block">
          <p class="eyebrow">Governance signal</p>
          <div class="stat-pair-grid">
            <article>
              <span>Yes of total VP</span>
              <strong>${formatMetricPercent(metrics.supportPercent, 1)}</strong>
              <small>${metrics.yesWeight.toFixed(2)} / ${metrics.totalRegionalVp.toFixed(2)} yes VP</small>
            </article>
            <article>
              <span>No of total VP</span>
              <strong>${formatMetricPercent(metrics.oppositionPercent, 1)}</strong>
              <small>${metrics.noWeight.toFixed(2)} / ${metrics.totalRegionalVp.toFixed(2)} no VP</small>
            </article>
            <article>
              <span>Turnout</span>
              <strong>${formatMetricPercent(metrics.turnoutPercent, 1)}</strong>
              <small>${metrics.totalCastWeight.toFixed(2)} of ${metrics.totalRegionalVp.toFixed(2)} VP</small>
            </article>
            <article>
              <span>Yes share of cast VP</span>
              <strong>${formatMetricPercent(metrics.supportShareOfCastPercent, 1)}</strong>
              <small>${proposal.riskFlags.length ? proposal.riskFlags.join(", ") : "No risk flags recorded"}</small>
            </article>
          </div>
        </section>

        <section class="detail-block">
          <p class="eyebrow">Payload</p>
          <div class="detail-list">
            <div><span>Budget</span><strong>${escapeHtml(
              formatAmount(proposal.budgetAmount, proposal.budgetCurrency),
            )}</strong></div>
            <div><span>Executor</span><strong>${escapeHtml(proposal.executorName ?? "Not set")}</strong></div>
            <div><span>Timeline</span><strong>${escapeHtml(proposal.timeline ?? "Not set")}</strong></div>
            <div><span>Created</span><strong>${escapeHtml(formatDate(proposal.createdAt))}</strong></div>
            <div><span>Voting ends</span><strong>${escapeHtml(formatDate(proposal.votingEndsAt))}</strong></div>
            <div><span>Budget breakdown</span><strong>${escapeHtml(proposal.budgetBreakdown ?? "No breakdown")}</strong></div>
            <div><span>Execution plan</span><strong>${escapeHtml(proposal.executionPlan ?? "No execution plan")}</strong></div>
            <div><span>Expected impact</span><strong>${escapeHtml(proposal.expectedImpact ?? "No impact statement")}</strong></div>
          </div>
          <p class="body-copy">${escapeHtml(proposal.description)}</p>
        </section>

        ${
          contract
            ? `
              <section class="detail-block">
                <p class="eyebrow">Contract</p>
                <div class="detail-list">
                  <div><span>Status</span><strong>${escapeHtml(contract.status)}</strong></div>
                  <div><span>Signature mode</span><strong>${escapeHtml(contract.signatureMode)}</strong></div>
                  <div><span>Company</span><strong>${escapeHtml(contract.company.legalName)}</strong></div>
                  <div><span>Representative</span><strong>${escapeHtml(contract.company.representativeName)}</strong></div>
                  <div><span>Representative principal</span><strong>${escapeHtml(
                    contract.company.representativePrincipal ?? "Unassigned",
                  )}</strong></div>
                  <div><span>External provider</span><strong>${escapeHtml(contract.externalProvider ?? "Not used")}</strong></div>
                  <div><span>Created</span><strong>${escapeHtml(formatDate(contract.createdAt))}</strong></div>
                  <div><span>Updated</span><strong>${escapeHtml(formatDate(contract.updatedAt))}</strong></div>
                </div>
              </section>
            `
            : ""
        }

        <section class="detail-block">
          <p class="eyebrow">Votes</p>
          ${this.renderVotes(votes, this.state.voteLoadingId === proposal.idText)}
        </section>

        <section class="detail-block">
          <p class="eyebrow">Audit</p>
          ${this.renderTimeline(auditTrail)}
        </section>
      </aside>
    `;
  }

  renderLoading() {
    return `
      <div class="app-shell">
        <section class="loading-hero"><h1>Loading chain feed...</h1></section>

        <section class="feed-grid">
          ${Array.from({ length: 4 }, () => `<article class="proposal-card skeleton"></article>`).join("")}
        </section>
      </div>
      ${this.renderDetailSheet()}
    `;
  }

  render() {
    if (this.state.loading) {
      this.root.innerHTML = this.renderLoading();
      return;
    }

    this.root.innerHTML = `
      <div class="ambient ambient--one"></div>
      <div class="ambient ambient--two"></div>
      <main class="app-shell">
        ${this.renderSummaryCards()}
        ${
          this.state.error
            ? `<div class="banner banner--error">${escapeHtml(this.state.error)}</div>`
            : ""
        }
        ${this.renderControls()}
        ${this.renderFeed()}
      </main>

      ${this.renderDetailSheet()}
    `;
  }
}

new ScannerApp(document.querySelector("#app"));
