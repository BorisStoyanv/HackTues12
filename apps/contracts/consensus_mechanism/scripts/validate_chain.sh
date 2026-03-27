#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER_CANISTER_ID="ryjl3-tyaaa-aaaaa-aaaba-cai"
CONSENSUS_CANISTER="consensus_mechanism"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/validate_chain.sh <proposal_id> <happy|guardrails> [funder_identity] [beneficiary_identity]

Examples:
  ./scripts/validate_chain.sh 1 happy investor1 community1
  ./scripts/validate_chain.sh 2 guardrails investor1 community2
EOF
}

bootstrap_env() {
  if [[ -f "$HOME/.local/share/dfx/env" ]]; then
    # shellcheck disable=SC1091
    source "$HOME/.local/share/dfx/env"
  fi

  if [[ -f "$HOME/.cargo/env" ]]; then
    # shellcheck disable=SC1091
    source "$HOME/.cargo/env"
  fi

  cd "$ROOT_DIR"
}

ledger_ready() {
  dfx canister call "$LEDGER_CANISTER_ID" icrc1_name '()' >/dev/null 2>&1
}

consensus_ready() {
  dfx canister call "$CONSENSUS_CANISTER" get_settings_view '()' >/dev/null 2>&1
}

assert_chain_ready() {
  if ! dfx ping local >/dev/null 2>&1; then
    echo "Local replica is not running." >&2
    echo "Run: bash scripts/local_dev_chain.sh setup --reset" >&2
    exit 1
  fi

  if ! ledger_ready; then
    echo "Local ICP ledger is not installed on this replica." >&2
    echo "Run: bash scripts/local_dev_chain.sh setup --reset" >&2
    exit 1
  fi

  if ! consensus_ready; then
    echo "Consensus canister is missing or has no wasm installed on this replica." >&2
    echo "Run: bash scripts/local_dev_chain.sh setup --reset" >&2
    exit 1
  fi
}

principal_of() {
  local identity="$1"
  dfx --identity "$identity" identity get-principal
}

balance_of() {
  local identity="$1"
  dfx --identity "$identity" ledger balance
}

flatten() {
  tr '\n' ' '
}

extract_variant_field() {
  local payload="$1"
  local field="$2"
  echo "$payload" | flatten | sed -n "s/.*$field = variant { \\([^ }][^ }]*\\) }.*/\\1/p" | head -n 1
}

extract_nat_field() {
  local payload="$1"
  local field="$2"
  echo "$payload" | flatten | sed -n "s/.*$field = \\([0-9_][0-9_]*\\) : nat[0-9]*.*/\\1/p" | tr -d '_' | head -n 1
}

extract_opt_nat_field() {
  local payload="$1"
  local field="$2"
  echo "$payload" | flatten | sed -n "s/.*$field = opt (\\([0-9_][0-9_]*\\) : nat[0-9]*).*/\\1/p" | tr -d '_' | head -n 1
}

must_contain() {
  local haystack="$1"
  local needle="$2"
  local message="$3"

  if [[ "$haystack" != *"$needle"* ]]; then
    echo "Validation failed: $message" >&2
    exit 1
  fi
}

ledger_block_lookup() {
  local block_index="$1"
  local output

  output="$(dfx canister call "$LEDGER_CANISTER_ID" get_blocks "(record { start = $block_index; length = 1 })" 2>/dev/null || true)"
  if [[ "$output" == *"blocks ="* ]]; then
    echo "$output"
    return 0
  fi

  output="$(dfx canister call "$LEDGER_CANISTER_ID" query_blocks "(record { start = $block_index; length = 1 })" 2>/dev/null || true)"
  if [[ "$output" == *"blocks ="* ]]; then
    echo "$output"
    return 0
  fi

  return 1
}

main() {
  local proposal_id="${1:-}"
  local mode="${2:-}"
  local funder_identity="${3:-investor1}"
  local beneficiary_identity="${4:-}"
  local expected_status=""
  local expected_escrow=""
  local expected_votes=""
  local proposal_view
  local votes
  local events
  local proposal_status
  local escrow_state
  local voter_count
  local yes_votes
  local no_votes
  local deposit_block_index
  local release_block_index
  local refund_block_index
  local funder_principal
  local beneficiary_principal

  if [[ -z "$proposal_id" || -z "$mode" ]]; then
    usage
    exit 1
  fi

  case "$mode" in
    happy)
      expected_status="Backed"
      expected_escrow="Released"
      expected_votes="3"
      beneficiary_identity="${beneficiary_identity:-community1}"
      ;;
    guardrails|refund)
      expected_status="Rejected"
      expected_escrow=""
      expected_votes="2"
      beneficiary_identity="${beneficiary_identity:-community2}"
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  bootstrap_env
  assert_chain_ready

  proposal_view="$(dfx canister call "$CONSENSUS_CANISTER" get_proposal_view "($proposal_id)")"
  votes="$(dfx canister call "$CONSENSUS_CANISTER" list_votes "($proposal_id)")"
  events="$(dfx canister call "$CONSENSUS_CANISTER" list_audit_events "(opt $proposal_id)")"

  must_contain "$proposal_view" "opt record" "proposal $proposal_id was not found"

  proposal_status="$(extract_variant_field "$proposal_view" "status")"
  escrow_state="$(extract_variant_field "$proposal_view" "state")"
  voter_count="$(extract_nat_field "$proposal_view" "voter_count")"
  deposit_block_index="$(extract_nat_field "$proposal_view" "deposit_block_index")"
  release_block_index="$(extract_opt_nat_field "$proposal_view" "release_block_index")"
  refund_block_index="$(extract_opt_nat_field "$proposal_view" "refund_block_index")"
  yes_votes="$(printf '%s\n' "$votes" | grep -c 'in_favor = true' || true)"
  no_votes="$(printf '%s\n' "$votes" | grep -c 'in_favor = false' || true)"

  if [[ "$proposal_status" != "$expected_status" ]]; then
    echo "Validation failed: expected status $expected_status, got $proposal_status" >&2
    exit 1
  fi

  if [[ -n "$expected_escrow" && "$escrow_state" != "$expected_escrow" ]]; then
    echo "Validation failed: expected escrow state $expected_escrow, got $escrow_state" >&2
    exit 1
  fi

  if [[ -z "$expected_escrow" && -n "$escrow_state" ]]; then
    echo "Validation failed: expected no escrow state, got $escrow_state" >&2
    exit 1
  fi

  if [[ "$voter_count" != "$expected_votes" ]]; then
    echo "Validation failed: expected voter_count $expected_votes, got $voter_count" >&2
    exit 1
  fi

  if [[ "$mode" == "happy" && -z "$deposit_block_index" ]]; then
    echo "Validation failed: deposit_block_index is missing" >&2
    exit 1
  fi

  must_contain "$events" 'event_type = variant { ProposalFinalized }' "missing ProposalFinalized audit event"

  if [[ "$mode" == "happy" ]]; then
    must_contain "$events" 'event_type = variant { ProposalBacked }' "missing ProposalBacked audit event"
    if [[ -z "$release_block_index" ]]; then
      echo "Validation failed: release_block_index is missing" >&2
      exit 1
    fi
    must_contain "$events" 'event_type = variant { EscrowReleased }' "missing EscrowReleased audit event"
  else
    if [[ -n "$deposit_block_index" ]]; then
      echo "Validation failed: deposit_block_index should not exist for guardrail flow" >&2
      exit 1
    fi
    if [[ "$events" == *'event_type = variant { ProposalBacked }'* ]]; then
      echo "Validation failed: ProposalBacked should not exist for guardrail flow" >&2
      exit 1
    fi
  fi

  funder_principal="$(principal_of "$funder_identity")"
  beneficiary_principal="$(principal_of "$beneficiary_identity")"

  echo "Validation passed for proposal $proposal_id"
  echo "  mode                : $mode"
  echo "  proposal status     : $proposal_status"
  echo "  escrow state        : $escrow_state"
  echo "  voter count         : $voter_count"
  echo "  yes votes           : $yes_votes"
  echo "  no votes            : $no_votes"
  if [[ -n "$deposit_block_index" ]]; then
    echo "  deposit block index : $deposit_block_index"
  else
    echo "  deposit block index : not created"
  fi
  if [[ -n "$release_block_index" ]]; then
    echo "  release block index : $release_block_index"
  fi
  if [[ -n "$refund_block_index" ]]; then
    echo "  refund block index  : $refund_block_index"
  fi
  echo "  funder principal    : $funder_principal"
  echo "  funder balance      : $(balance_of "$funder_identity")"
  echo "  beneficiary         : $beneficiary_principal"
  echo "  beneficiary balance : $(balance_of "$beneficiary_identity")"

  if [[ -n "$deposit_block_index" ]]; then
    if ledger_block_lookup "$deposit_block_index" >/dev/null; then
      echo "  ledger deposit      : block $deposit_block_index is queryable on the ledger"
    else
      echo "  ledger deposit      : block query unavailable, using on-chain block index"
    fi
  fi

  if [[ -n "$release_block_index" ]]; then
    if ledger_block_lookup "$release_block_index" >/dev/null; then
      echo "  ledger release      : block $release_block_index is queryable on the ledger"
    else
      echo "  ledger release      : block query unavailable, using on-chain block index"
    fi
  fi

  if [[ -n "$refund_block_index" ]]; then
    if ledger_block_lookup "$refund_block_index" >/dev/null; then
      echo "  ledger refund       : block $refund_block_index is queryable on the ledger"
    else
      echo "  ledger refund       : block query unavailable, using on-chain block index"
    fi
  fi
}

main "$@"
