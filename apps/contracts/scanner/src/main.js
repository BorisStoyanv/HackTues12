import "./styles.css";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { idlFactory } from "./icp_proposals_idl.js";

const DEFAULT_CANISTER_ID = "sk6yb-aqaaa-aaaad-qljxa-cai";
const urlParams = new URLSearchParams(window.location.search);
const envNetwork = (import.meta.env.DFX_NETWORK ?? "ic").replaceAll("'", "");
const canisterId =
  urlParams.get("canister") ??
  import.meta.env.CANISTER_ID_CONSENSUS_MECHANISM ??
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
  "Released",
  "Refunded",
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
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (value == null) return 0n;
  return BigInt(value);
}

function formatDate(ns) {
  if (!ns) return "Unknown";
  const millis = Number(toBigInt(ns) / 1_000_000n);
  return new Date(millis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelative(ns) {
  if (!ns) return "Unknown";
  const millis = Number(toBigInt(ns) / 1_000_000n);
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
  const diff = toBigInt(endNs) - BigInt(Date.now()) * 1_000_000n;
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

function formatIcp(amountE8s) {
  if (amountE8s == null) return "Not set";
  const amount = Number(toBigInt(amountE8s)) / 100_000_000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount < 10 ? 2 : 0,
    maximumFractionDigits: 4,
  })} ICP`;
}

function formatWindow(ns) {
  if (!ns) return "Unknown";
  const totalMinutes = Number(toBigInt(ns) / 60_000_000_000n);
  if (totalMinutes >= 1440) return `${Math.round(totalMinutes / 1440)}d`;
  if (totalMinutes >= 60) return `${Math.round(totalMinutes / 60)}h`;
  return `${totalMinutes}m`;
}

function calculateQuorumThreshold(activeUsers, settings) {
  if (!settings) return 0;
  if (activeUsers < settings.smallRegionCutoff) {
    return settings.smallRegionMinVotes;
  }
  return Math.ceil((activeUsers * settings.quorumBasisPoints) / 10_000);
}

function normalizeEscrow(escrow) {
  if (!escrow) return null;
  return {
    funder: principalText(escrow.funder),
    beneficiary: principalText(escrow.beneficiary),
    amountE8s: escrow.amount_e8s,
    transferFeeE8s: escrow.transfer_fee_e8s,
    escrowSubaccountHex: escrow.escrow_subaccount_hex,
    depositBlockIndex: escrow.deposit_block_index.toString(),
    state: variantKey(escrow.state),
    depositReference: optionValue(escrow.deposit_reference),
    releaseReference: optionValue(escrow.release_reference),
    refundReference: optionValue(escrow.refund_reference),
    depositedAt: escrow.deposited_at,
    releasedAt: optionValue(escrow.released_at),
    refundedAt: optionValue(escrow.refunded_at),
    releaseBlockIndex: optionValue(escrow.release_block_index)?.toString() ?? null,
    refundBlockIndex: optionValue(escrow.refund_block_index)?.toString() ?? null,
  };
}

function normalizeProposal(proposal) {
  return {
    id: proposal.id,
    idText: proposal.id.toString(),
    kind: variantKey(proposal.kind),
    title: proposal.title,
    description: proposal.description,
    budgetDescription: proposal.budget_description,
    submitter: principalText(proposal.submitter),
    beneficiary: principalText(proposal.beneficiary),
    region: proposal.region_tag,
    requestedFundingE8s: proposal.requested_funding_e8s,
    fairnessScore: optionValue(proposal.fairness_score),
    riskFlags: proposal.risk_flags ?? [],
    fundingProgramId: optionValue(proposal.funding_program_id)?.toString() ?? null,
    backedBy: principalText(optionValue(proposal.backed_by)),
    backedAt: optionValue(proposal.backed_at),
    resolvedTotalVp: optionValue(proposal.resolved_total_vp),
    status: variantKey(proposal.status),
    createdAt: proposal.created_at,
    votingEndsAt: proposal.voting_ends_at,
    yesWeight: proposal.yes_weight,
    noWeight: proposal.no_weight,
    voterCount: proposal.voter_count,
    escrow: normalizeEscrow(optionValue(proposal.escrow)),
    category: variantKey(optionValue(proposal.category)),
    budgetAmount: optionValue(proposal.budget_amount),
    budgetCurrency: optionValue(proposal.budget_currency),
  };
}

function normalizeEscrowAccount(result) {
  if (!result || !("Ok" in result)) return null;
  return {
    proposalId: result.Ok.proposal_id.toString(),
    ledgerCanisterId: principalText(result.Ok.ledger_canister_id),
    accountOwner: principalText(result.Ok.account_owner),
    subaccountHex: result.Ok.subaccount_hex,
    accountIdHex: result.Ok.account_id_hex,
    requestedAmountE8s: result.Ok.requested_amount_e8s,
    suggestedTransferFeeE8s: result.Ok.suggested_transfer_fee_e8s,
    suggestedDepositE8s: result.Ok.suggested_deposit_e8s,
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

function normalizeSettings(settings) {
  return {
    controller: principalText(settings.controller),
    ledgerCanisterId: principalText(settings.ledger_canister_id),
    quorumBasisPoints: Number(settings.quorum_basis_points),
    approvalBasisPoints: Number(settings.approval_basis_points),
    activeWindowNs: settings.active_window_ns,
    votingWindowNs: settings.voting_window_ns,
    smallRegionCutoff: Number(settings.small_region_cutoff),
    smallRegionMinVotes: Number(settings.small_region_min_votes),
  };
}

function getProposalVotingMetrics(proposal, totalRegionalVp) {
  const yesWeight = proposal.yes_weight ?? 0;
  const noWeight = proposal.no_weight ?? 0;
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

function formatAmount(amount, currency) {
  if (amount == null) return "Unknown";
  return `${amount.toLocaleString()} ${currency || "USD"}`;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function createFingerprints(proposals, escrowAccounts, auditByProposal) {
  const records = await Promise.all(
    proposals.map(async (proposal) => {
      const escrowAccount = escrowAccounts.get(proposal.idText) ?? null;
      const auditTrail = auditByProposal.get(proposal.idText) ?? [];
      const canonical = JSON.stringify({
        id: proposal.idText,
        title: proposal.title,
        status: proposal.status,
        kind: proposal.kind,
        requestedFundingE8s: proposal.requestedFundingE8s.toString(),
        submitter: proposal.submitter,
        beneficiary: proposal.beneficiary,
        backedBy: proposal.backedBy,
        escrowState: proposal.escrow?.state ?? null,
        depositBlockIndex: proposal.escrow?.depositBlockIndex ?? null,
        escrowAccountId: escrowAccount?.accountIdHex ?? null,
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
      settings: null,
      proposals: [],
      proposalViews: new Map(),
      escrowAccounts: new Map(),
      quorumByRegion: new Map(),
      auditEvents: [],
      auditByProposal: new Map(),
      votesByProposal: new Map(),
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
      const [rawSettings, rawProposals, rawAudit] = await Promise.all([
        actor.get_settings_view(),
        actor.list_proposals(),
        actor.list_audit_events([]),
      ]);

      const settings = normalizeSettings(rawSettings);
      const proposals = rawProposals
        .map(normalizeProposal)
        .sort((left, right) => Number(right.id - left.id));

      const proposalViewPairs = await Promise.all(
        proposals.map(async (proposal) => {
          const rawView = await actor.get_proposal_view(proposal.id);
          const normalized = optionValue(rawView)
            ? normalizeProposal(optionValue(rawView))
            : proposal;
          return [proposal.idText, normalized];
        }),
      );
      const proposalViews = new Map(proposalViewPairs);

      const escrowPairs = await Promise.all(
        proposals.map(async (proposal) => {
          const result = await actor.get_proposal_escrow_account(proposal.id);
          return [proposal.idText, normalizeEscrowAccount(result)];
        }),
      );
      const escrowAccounts = new Map(escrowPairs);

      const regionNames = [...new Set(proposals.map((proposal) => proposal.region))];
      const quorumByRegion = new Map(
        await Promise.all(
          regionNames.map(async (region) => [
            region,
            Number(await actor.get_quorum_snapshot(region)),
          ]),
        ),
      );

      const votePairs = await Promise.all(
        proposals.map(async (proposal) => {
          const votes = await actor.list_votes(proposal.id);
          return [
            proposal.idText,
            votes
              .map(normalizeVote)
              .sort((left, right) => Number(toBigInt(right.timestamp) - toBigInt(left.timestamp))),
          ];
        }),
      );
      const votesByProposal = new Map(votePairs);

      const auditEvents = rawAudit.map(normalizeAudit);
      const auditByProposal = auditEvents.reduce((groups, event) => {
        if (!event.proposalId) return groups;
        const existing = groups.get(event.proposalId) ?? [];
        existing.push(event);
        groups.set(event.proposalId, existing);
        return groups;
      }, new Map());

      const proposalsWithViews = proposals.map(
        (proposal) => proposalViews.get(proposal.idText) ?? proposal,
      );
      const fingerprints = await createFingerprints(
        proposalsWithViews,
        escrowAccounts,
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
        settings,
        proposals: proposalsWithViews,
        proposalViews,
        escrowAccounts,
        quorumByRegion,
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
      this.state.selectedId = openButton.dataset.openProposal;
      this.render();
    }
  }

  handleInput(event) {
    const searchField = event.target.closest("[data-search]");
    if (searchField) {
      this.state.search = searchField.value;
      this.render();
    }
  }

  proposalMatchesFilter(proposal) {
    if (this.state.filter === "All") return true;
    if (proposal.status === this.state.filter) return true;
    if (this.state.filter === "Released") return proposal.escrow?.state === "Released";
    if (this.state.filter === "Refunded") return proposal.escrow?.state === "Refunded";
    return false;
  }

  getVisibleProposals() {
    const query = this.state.search.trim().toLowerCase();
    return this.state.proposals.filter((proposal) => {
      if (!this.proposalMatchesFilter(proposal)) return false;
      if (!query) return true;
      const haystack = [
        proposal.title,
        proposal.description,
        proposal.region,
        proposal.submitter,
        proposal.beneficiary,
        proposal.kind,
        proposal.backedBy,
        proposal.escrow?.state,
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
      escrowAccount: this.state.escrowAccounts.get(proposal.idText) ?? null,
      fingerprint: this.state.fingerprints.get(proposal.idText) ?? null,
      votes: this.state.votesByProposal.get(proposal.idText) ?? [],
      auditTrail: this.state.auditByProposal.get(proposal.idText) ?? [],
      activeRegionUsers: this.state.quorumByRegion.get(proposal.region) ?? 0,
    };
  }

  renderStatusPill(label) {
    return `<span class="status-pill status-pill--${escapeHtml(
      label.toLowerCase(),
    )}">${escapeHtml(humanizeLabel(label))}</span>`;
  }

  renderSummaryCards() {
    const { proposals, auditEvents, settings, lastSync } = this.state;
    const active = proposals.filter((proposal) => proposal.status === "Active").length;
    const awaitingFunding = proposals.filter(
      (proposal) => proposal.status === "AwaitingFunding",
    ).length;
    const funded = proposals.filter((proposal) => proposal.escrow?.state === "Held").length;
    const released = proposals.filter(
      (proposal) => proposal.escrow?.state === "Released",
    ).length;
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
              <p class="brand-kicker">Consensus Scanner</p>
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
            <span>Escrow Held</span>
            <strong>${funded}</strong>
          </article>
        </div>

        <div class="chain-ticker">
          <span class="ticker-chip">${active} live</span>
          <span class="ticker-chip">${released} released</span>
          <span class="ticker-chip">${pluralize(auditEvents.length, "audit", "audits")}</span>
          ${
            settings
              ? `<span class="ticker-chip">${formatWindow(
                  settings.votingWindowNs,
                )} voting window</span>`
              : ""
          }
          ${
            settings
              ? `<span class="ticker-chip">${formatPercent(
                  settings.quorumBasisPoints / 10_000,
                )} quorum / ${formatPercent(
                  settings.approvalBasisPoints / 10_000,
                )} yes</span>`
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
            placeholder="title / principal / region / escrow"
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
    const votes = this.state.votesByProposal.get(proposal.idText) ?? [];
    const fingerprint = this.state.fingerprints.get(proposal.idText) ?? "pending";
    const regionTotalVp = this.state.quorumByRegion.get(proposal.region) ?? 0;
    const metrics = getProposalVotingMetrics(proposal, regionTotalVp);
    
    const isPassedStatus =
      proposal.status === "AwaitingFunding" || proposal.status === "Backed";
    const isResolvedWithQuorum = isPassedStatus || proposal.status === "Rejected";
    const quorumReached =
      metrics.turnoutPercent >= QUORUM_PERCENT_OF_TOTAL || isResolvedWithQuorum;
    const approvalReached =
      metrics.supportPercent >= ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL;
    const approvalRulePassed = approvalReached || isPassedStatus;

    const supportLabel = metrics.totalRegionalVp > 0
      ? `${metrics.yesWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} yes VP`
      : `${metrics.yesWeight.toFixed(1)} yes VP`;
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
              ${proposal.escrow?.state ? this.renderStatusPill(proposal.escrow.state) : ""}
            </div>
            <code class="fingerprint-inline">${escapeHtml(shorten(fingerprint, 12, 10))}</code>
          </div>

          <h3>${escapeHtml(proposal.title)}</h3>
          <p class="card-caption">${escapeHtml(humanizeLabel(proposal.status))}</p>

          <div class="tag-row">
            <span class="tag-chip">${escapeHtml(proposal.region)}</span>
            <span class="tag-chip">${escapeHtml(proposal.category || "General")}</span>
          </div>

          <div class="hash-stack">
            <div class="hash-line">
              <span>submitter</span>
              <code>${escapeHtml(shorten(proposal.submitter, 12, 8))}</code>
            </div>
            <div class="hash-line">
              <span>beneficiary</span>
              <code>${escapeHtml(shorten(proposal.beneficiary, 12, 8))}</code>
            </div>
            <div class="hash-line">
              <span>funder</span>
              <code>${escapeHtml(shorten(proposal.backedBy ?? "Awaiting NPO", 12, 8))}</code>
            </div>
          </div>
        </div>

        <section class="governance-panel">
          <div class="governance-metrics">
            <article class="governance-metric governance-metric--yes">
              <span>Yes of total VP</span>
              <strong>${formatMetricPercent(metrics.supportPercent, 1)}</strong>
              <small>${escapeHtml(metrics.hasVotes ? supportLabel : "0.0 yes VP")}</small>
            </article>
            <article class="governance-metric">
              <span>Turnout</span>
              <strong>${formatMetricPercent(metrics.turnoutPercent, 1)}</strong>
              <small>${escapeHtml(turnoutLabel)}</small>
            </article>
          </div>

          <div class="vote-meter" aria-hidden="true">
            <div class="vote-meter__bar">
              <span class="vote-meter__yes" style="width:${Math.min(metrics.supportPercent, 100)}%"></span>
              <span class="vote-meter__no" style="width:${Math.min(metrics.oppositionPercent, 100)}%"></span>
            </div>
          </div>

          <div class="governance-rules">
            <article class="governance-rule">
              <span class="governance-rule__icon ${quorumReached ? "is-met" : ""}"></span>
              <div>
                <strong>Quorum reached</strong>
                <small>${formatMetricPercent(metrics.turnoutPercent, 1)} turnout</small>
              </div>
            </article>
            <article class="governance-rule">
              <span class="governance-rule__icon ${approvalRulePassed ? "is-met" : ""}"></span>
              <div>
                <strong>Approval threshold</strong>
                <small>${formatMetricPercent(metrics.supportPercent, 1)} Yes VP</small>
              </div>
            </article>
          </div>
        </section>

        <section class="ledger-snapshot">
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
      return `<p class="section-empty">No audit events were returned for this proposal.</p>`;
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

  renderVotes(votes) {
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

    const { proposal, escrowAccount, fingerprint, votes, auditTrail, activeRegionUsers } =
      selected;
    
    const metrics = getProposalVotingMetrics(proposal, activeRegionUsers);
    const anchorHash = fingerprint ?? "pending";
    const latestFundingEvent = auditTrail.find(
      (event) =>
        event.eventType === "ProposalBacked" ||
        event.eventType === "EscrowReleased" ||
        event.eventType === "EscrowRefunded",
    );

    return `
      <div class="sheet-backdrop is-open" data-close-sheet></div>
      <aside class="detail-sheet is-open">
        <div class="detail-sheet__header">
          <div>
            <p class="eyebrow">Proposal #${escapeHtml(proposal.idText)}</p>
            <h2>${escapeHtml(proposal.title)}</h2>
            <p class="sheet-copy">${escapeHtml(
              proposal.escrow?.state
                ? `${humanizeLabel(proposal.status)} with ${humanizeLabel(
                    proposal.escrow.state,
                  )} escrow`
                : humanizeLabel(proposal.status),
            )}</p>
          </div>
          <button class="sheet-close" type="button" data-close-sheet>Close</button>
        </div>

        <div class="detail-status-row">
          ${this.renderStatusPill(proposal.status)}
          ${proposal.escrow?.state ? this.renderStatusPill(proposal.escrow.state) : ""}
          <span class="tag-chip">${escapeHtml(proposal.region)}</span>
          <span class="tag-chip">${escapeHtml(humanizeLabel(proposal.kind))}</span>
        </div>

        <section class="detail-block detail-block--proof">
          <div class="proof-header">
            <div>
              <p class="eyebrow">Anchors</p>
              <h3>Proposal and ledger references</h3>
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
              <span>Escrow account id</span>
              <code>${escapeHtml(escrowAccount?.accountIdHex ?? "Not available")}</code>
            </article>
            <article>
              <span>Submitter principal</span>
              <code>${escapeHtml(proposal.submitter)}</code>
            </article>
            <article>
              <span>NPO principal</span>
              <code>${escapeHtml(proposal.backedBy ?? "Awaiting funding")}</code>
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
              <span>Turnout</span>
              <strong>${formatMetricPercent(metrics.turnoutPercent, 1)}</strong>
              <small>${metrics.totalCastWeight.toFixed(2)} of ${metrics.totalRegionalVp.toFixed(2)} VP</small>
            </article>
            <article>
              <span>Quorum threshold</span>
              <strong>${QUORUM_PERCENT_OF_TOTAL}%</strong>
              <small>${activeRegionUsers} active users in ${escapeHtml(proposal.region)}</small>
            </article>
            <article>
              <span>Fairness score</span>
              <strong>${proposal.fairnessScore != null ? proposal.fairnessScore.toFixed(2) : "Pending"}</strong>
              <small>${escapeHtml(
                proposal.riskFlags.length
                  ? proposal.riskFlags.join(", ")
                  : "No risk flags recorded",
              )}</small>
            </article>
          </div>
        </section>

        <section class="detail-block">
          <p class="eyebrow">Funding</p>
          <div class="detail-list">
            <div><span>Requested amount</span><strong>${escapeHtml(formatIcp(proposal.requestedFundingE8s))}</strong></div>
            <div><span>Suggested deposit</span><strong>${escapeHtml(formatIcp(escrowAccount?.suggestedDepositE8s ?? null))}</strong></div>
            <div><span>Ledger canister</span><strong>${escapeHtml(
              escrowAccount?.ledgerCanisterId ?? this.state.settings?.ledgerCanisterId ?? "Unknown",
            )}</strong></div>
            <div><span>Proposal escrow owner</span><strong>${escapeHtml(escrowAccount?.accountOwner ?? "Unknown")}</strong></div>
            <div><span>Escrow subaccount</span><strong>${escapeHtml(escrowAccount?.subaccountHex ?? "Unknown")}</strong></div>
            <div><span>Beneficiary</span><strong>${escapeHtml(proposal.beneficiary)}</strong></div>
            <div><span>Funded by</span><strong>${escapeHtml(proposal.backedBy ?? "Awaiting NPO")}</strong></div>
            <div><span>Backed at</span><strong>${escapeHtml(
              proposal.backedAt ? formatDate(proposal.backedAt) : "Not funded yet",
            )}</strong></div>
            <div><span>Escrow state</span><strong>${escapeHtml(proposal.escrow?.state ?? "None")}</strong></div>
            <div><span>Deposit block</span><strong>${escapeHtml(proposal.escrow?.depositBlockIndex ?? "Pending")}</strong></div>
            <div><span>Release block</span><strong>${escapeHtml(proposal.escrow?.releaseBlockIndex ?? "Pending")}</strong></div>
            <div><span>Refund block</span><strong>${escapeHtml(proposal.escrow?.refundBlockIndex ?? "Pending")}</strong></div>
          </div>
          ${
            latestFundingEvent
              ? `<p class="body-copy">${escapeHtml(
                  `${humanizeLabel(latestFundingEvent.eventType)} recorded ${formatRelative(
                    latestFundingEvent.timestamp,
                  )}.`,
                )}</p>`
              : ""
          }
        </section>

        <section class="detail-block">
          <p class="eyebrow">Payload</p>
          <div class="detail-list">
            <div><span>Budget description</span><strong>${escapeHtml(proposal.budgetDescription)}</strong></div>
            <div><span>Created</span><strong>${escapeHtml(formatDate(proposal.createdAt))}</strong></div>
            <div><span>Voting ends</span><strong>${escapeHtml(formatDate(proposal.votingEndsAt))}</strong></div>
            <div><span>Funding program</span><strong>${escapeHtml(proposal.fundingProgramId ?? "Open funding")}</strong></div>
          </div>
          <p class="body-copy">${escapeHtml(proposal.description)}</p>
        </section>

        <section class="detail-block">
          <p class="eyebrow">Votes</p>
          ${this.renderVotes(votes)}
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
