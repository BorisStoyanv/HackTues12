#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEDGER_CANISTER_ID="ryjl3-tyaaa-aaaaa-aaaba-cai"
CONSENSUS_CANISTER="consensus_mechanism"
NNS_TEST_IDENTITY="ident-1"
NNS_TEST_PEM="$ROOT_DIR/ledger/ident-1.pem"
NETWORKS_JSON="$HOME/.config/dfx/networks.json"
NETWORKS_JSON_BACKUP="$HOME/.config/dfx/networks.json.codex-backup"
TOP_UP_AMOUNT_ICP="20"
LOG_DIR="$ROOT_DIR/.dfx/codex-logs"

IDENTITIES=(controller minter community1 community2 community3 investor1)

usage() {
  cat <<'EOF'
Usage:
  ./scripts/local_dev_chain.sh setup [--reset]
  ./scripts/local_dev_chain.sh happy
  ./scripts/local_dev_chain.sh refund
  ./scripts/local_dev_chain.sh balances [identity...]
  ./scripts/local_dev_chain.sh verify <proposal_id> <happy|refund> [funder_identity] [beneficiary_identity]

What it does:
  setup     Starts/reuses a persistent local dfx network, deploys a local ICP ledger,
            deploys the consensus canister, registers mock users, and shortens voting.
  happy     Runs the happy-path governance + real ledger-backed escrow scenario.
  refund    Runs the refund-path governance + real ledger-backed refund scenario.
  balances  Prints principal, account-id, and local ICP balance for identities.
  verify    Validates votes, audit trail, escrow block indexes, and balances.

Notes:
  - The ledger balances are real on the local dev chain.
  - Funding uses ICRC-2 approval plus fund_proposal, which pulls ICP into a
    canister-owned proposal escrow subaccount before release or refund.
EOF
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

run_quiet() {
  local log_name="$1"
  shift
  ensure_log_dir

  if ! "$@" >"$LOG_DIR/$log_name.log" 2>&1; then
    echo "Command failed. See $LOG_DIR/$log_name.log" >&2
    tail -n 80 "$LOG_DIR/$log_name.log" >&2 || true
    exit 1
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
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

  require_cmd dfx
  require_cmd cargo
  require_cmd rustup
  require_cmd awk
  require_cmd sed
  require_cmd curl

  cd "$ROOT_DIR"
}

ensure_wasm_target() {
  rustup target add wasm32-unknown-unknown >/dev/null
}

ensure_identity() {
  local name="$1"
  if ! dfx identity list | awk '{print $1}' | grep -qx "$name"; then
    dfx identity new "$name" --storage-mode plaintext >/dev/null
  fi
}

ensure_identities() {
  for identity in "${IDENTITIES[@]}"; do
    ensure_identity "$identity"
  done
}

ensure_nns_extension() {
  dfx extension install nns >/dev/null 2>&1 || true
}

configure_system_local_network() {
  mkdir -p "$(dirname "$NETWORKS_JSON")"

  if [[ -f "$NETWORKS_JSON" && ! -f "$NETWORKS_JSON_BACKUP" ]]; then
    cp "$NETWORKS_JSON" "$NETWORKS_JSON_BACKUP"
  fi

  cat >"$NETWORKS_JSON" <<'EOF'
{
  "local": {
    "bind": "127.0.0.1:8080",
    "type": "ephemeral",
    "replica": {
      "subnet_type": "system"
    }
  }
}
EOF
}

principal_of() {
  local identity="$1"
  dfx --identity "$identity" identity get-principal
}

account_id_of() {
  local identity="$1"
  dfx --identity "$identity" ledger account-id
}

ledger_balance_of() {
  local identity="$1"
  dfx --identity "$identity" ledger balance
}

ensure_replica() {
  if ! dfx ping local >/dev/null 2>&1; then
    run_quiet dfx-start dfx start --background
  fi
}

reset_replica() {
  dfx stop >/dev/null 2>&1 || true
  rm -rf "$ROOT_DIR/.dfx"
  run_quiet dfx-start-clean dfx start --clean --background
}

ensure_nns_test_identity() {
  mkdir -p "$(dirname "$NNS_TEST_PEM")"
  cat >"$NNS_TEST_PEM" <<'EOF'
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEICJxApEbuZznKFpV+VKACRK30i6+7u5Z13/DOl18cIC+oAcGBSuBBAAK
oUQDQgAEPas6Iag4TUx+Uop+3NhE6s3FlayFtbwdhRVjvOar0kPTfE/N8N6btRnd
74ly5xXEBNSXiENyxhEuzOZrIWMCNQ==
-----END EC PRIVATE KEY-----
EOF

  dfx identity import "$NNS_TEST_IDENTITY" "$NNS_TEST_PEM" --storage-mode plaintext --force >/dev/null 2>&1 || true
}

ledger_ready() {
  dfx canister call "$LEDGER_CANISTER_ID" icrc1_name '()' >/dev/null 2>&1
}

consensus_ready() {
  dfx canister call "$CONSENSUS_CANISTER" get_settings_view '()' >/dev/null 2>&1
}

assert_chain_ready() {
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

install_local_nns_if_needed() {
  if ledger_ready; then
    return
  fi

  run_quiet nns-install dfx extension run nns install
}

top_up_identity_if_needed() {
  local identity="$1"
  local memo="$2"
  local balance
  local account_id

  balance="$(ledger_balance_of "$identity" 2>/dev/null || true)"
  if [[ "$balance" == *"ICP"* ]] && [[ "$balance" != 0* ]]; then
    return
  fi

  account_id="$(account_id_of "$identity")"
  dfx --identity "$NNS_TEST_IDENTITY" ledger transfer --memo "$memo" --amount "$TOP_UP_AMOUNT_ICP" "$account_id" >/dev/null
}

seed_local_balances() {
  top_up_identity_if_needed controller 1001
  top_up_identity_if_needed community1 1002
  top_up_identity_if_needed community2 1003
  top_up_identity_if_needed community3 1004
  top_up_identity_if_needed investor1 1005
}

deploy_consensus() {
  run_quiet deploy-consensus dfx --identity controller deploy "$CONSENSUS_CANISTER"
}

update_consensus_settings() {
  dfx --identity controller canister call "$CONSENSUS_CANISTER" update_settings '(record {
    quorum_basis_points = null;
    approval_basis_points = null;
    active_window_ns = null;
    voting_window_ns = opt 30000000000;
    small_region_cutoff = null;
    small_region_min_votes = null;
  })' >/dev/null
}

register_if_needed() {
  local identity="$1"
  local payload="$2"
  local result

  result="$(dfx --identity "$identity" canister call "$CONSENSUS_CANISTER" register_user "$payload" 2>&1 || true)"
  if [[ "$result" == *'Err = "Caller is already registered"'* ]]; then
    return
  fi

  echo "$result"
}

register_users() {
  register_if_needed community1 '(record { user_type = variant { Community }; home_region = opt "sofia"; })'
  register_if_needed community2 '(record { user_type = variant { Community }; home_region = opt "sofia"; })'
  register_if_needed community3 '(record { user_type = variant { Community }; home_region = opt "sofia"; })'
  register_if_needed investor1 '(record { user_type = variant { Investor }; home_region = null; })'
}

setup() {
  local reset="${1:-0}"

  bootstrap_env
  ensure_wasm_target
  configure_system_local_network
  ensure_nns_extension
  ensure_identities
  ensure_nns_test_identity

  if [[ "$reset" == "1" ]]; then
    reset_replica
  else
    ensure_replica
  fi

  install_local_nns_if_needed
  seed_local_balances
  deploy_consensus
  update_consensus_settings
  register_users >/dev/null

  echo "Local dev chain is ready."
  echo "Consensus canister: $(dfx canister id "$CONSENSUS_CANISTER")"
  echo "ICP ledger canister: $LEDGER_CANISTER_ID"
  echo "Quiet logs: $LOG_DIR"
  echo
  print_balances investor1 community1
}

extract_proposal_id() {
  local output="$1"
  echo "$output" | tr '\n' ' ' | sed -n 's/.*id = \([0-9][0-9]*\) : nat64.*/\1/p' | head -n 1
}

extract_named_text_field() {
  local output="$1"
  local field="$2"
  echo "$output" | tr '\n' ' ' | sed -n "s/.*$field = \"\\([^\"]*\\)\".*/\\1/p" | head -n 1
}

extract_ledger_nat() {
  local output="$1"
  echo "$output" | tr '\n' ' ' | sed -n 's/.*(\([0-9_][0-9_]*\) : nat).*/\1/p' | tr -d '_' | head -n 1
}

extract_block_height() {
  local output="$1"
  echo "$output" | tr '\n' ' ' | sed -n 's/.*block height \([0-9][0-9]*\).*/\1/p' | head -n 1
}

ledger_fee_e8s() {
  local output
  output="$(dfx canister call "$LEDGER_CANISTER_ID" icrc1_fee '()')"
  extract_ledger_nat "$output"
}

escrow_account_view() {
  local proposal_id="$1"
  dfx canister call "$CONSENSUS_CANISTER" get_proposal_escrow_account "($proposal_id)"
}

submit_proposal() {
  local identity="$1"
  local title="$2"
  local description="$3"
  local budget="$4"
  local amount="$5"
  local beneficiary
  local result

  beneficiary="$(principal_of "$identity")"
  result="$(dfx --identity "$identity" canister call "$CONSENSUS_CANISTER" submit_proposal "(record {
    title = \"$title\";
    description = \"$description\";
    budget_description = \"$budget\";
    region_tag = \"sofia\";
    beneficiary = principal \"$beneficiary\";
    requested_funding_e8s = $amount;
  })")"

  echo "$result" >&2
  extract_proposal_id "$result"
}

vote() {
  local identity="$1"
  local proposal_id="$2"
  local in_favor="$3"
  dfx --identity "$identity" canister call "$CONSENSUS_CANISTER" submit_vote "(record { proposal_id = $proposal_id; in_favor = $in_favor; })" >/dev/null
}

finalize() {
  local identity="$1"
  local proposal_id="$2"
  dfx --identity "$identity" canister call "$CONSENSUS_CANISTER" finalize_proposal "($proposal_id)"
}

fund() {
  local proposal_id="$1"
  local amount="$2"
  local ref="$3"
  local fee_e8s
  local deposit_e8s
  local view
  local subaccount_hex
  local canister_id
  local approval_amount_e8s

  fee_e8s="$(ledger_fee_e8s)"
  deposit_e8s=$((amount + fee_e8s))
  approval_amount_e8s=$((deposit_e8s + fee_e8s))
  view="$(escrow_account_view "$proposal_id")"
  subaccount_hex="$(extract_named_text_field "$view" "subaccount_hex")"
  canister_id="$(dfx canister id "$CONSENSUS_CANISTER")"

  if [[ -z "$subaccount_hex" ]]; then
    echo "Failed to resolve escrow account for proposal $proposal_id" >&2
    echo "$view" >&2
    exit 1
  fi

  echo "Escrow subaccount for proposal $proposal_id: $subaccount_hex"
  echo "Approving canister $canister_id to pull $approval_amount_e8s e8s"

  dfx --identity investor1 canister call "$LEDGER_CANISTER_ID" icrc2_approve "(record {
    fee = opt $fee_e8s;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
    amount = $approval_amount_e8s;
    expected_allowance = null;
    expires_at = null;
    spender = record {
      owner = principal \"$canister_id\";
      subaccount = null;
    };
  })"

  dfx --identity investor1 canister call "$CONSENSUS_CANISTER" fund_proposal "(record {
    proposal_id = $proposal_id;
    amount_e8s = $amount;
    deposit_block_index = null;
    deposit_reference = opt \"$ref\";
  })"
}

release() {
  local identity="$1"
  local proposal_id="$2"
  local ref="$3"
  dfx --identity "$identity" canister call "$CONSENSUS_CANISTER" release_escrow "(record {
    proposal_id = $proposal_id;
    reference = opt \"$ref\";
  })"
}

refund() {
  local proposal_id="$1"
  local ref="$2"
  dfx --identity investor1 canister call "$CONSENSUS_CANISTER" refund_escrow "(record {
    proposal_id = $proposal_id;
    reference = opt \"$ref\";
  })"
}

print_balances() {
  local identities=("$@")
  if [[ "${#identities[@]}" -eq 0 ]]; then
    identities=(investor1 community1)
  fi

  for identity in "${identities[@]}"; do
    echo "[$identity]"
    echo "  principal : $(principal_of "$identity")"
    echo "  account-id: $(account_id_of "$identity")"
    echo "  balance   : $(ledger_balance_of "$identity")"
  done
}

run_happy_path() {
  setup 0

  local proposal_id
  proposal_id="$(submit_proposal community1 "Happy path $(date +%s)" "Local scripted happy path." "Stage, permits, local marketing" 100000000)"

  echo
  echo "Created proposal $proposal_id"
  print_balances investor1 community1

  vote community1 "$proposal_id" true
  vote community2 "$proposal_id" true
  vote community3 "$proposal_id" false

  sleep 35
  finalize community1 "$proposal_id"
  fund "$proposal_id" 100000000 "scripted-happy-deposit-$proposal_id"
  release community1 "$proposal_id" "scripted-happy-release-$proposal_id"

  echo
  dfx canister call "$CONSENSUS_CANISTER" get_proposal_view "($proposal_id)"
  echo
  print_balances investor1 community1
}

run_refund_path() {
  setup 0

  local proposal_id
  proposal_id="$(submit_proposal community2 "Refund path $(date +%s)" "Local scripted refund path." "Mock budget only" 50000000)"

  echo
  echo "Created proposal $proposal_id"
  print_balances investor1 community2

  fund "$proposal_id" 50000000 "scripted-refund-deposit-$proposal_id"
  vote community1 "$proposal_id" false
  vote community2 "$proposal_id" false

  sleep 35
  finalize community1 "$proposal_id"
  refund "$proposal_id" "scripted-refund-$proposal_id"

  echo
  dfx canister call "$CONSENSUS_CANISTER" get_proposal_view "($proposal_id)"
  echo
  print_balances investor1 community2
}

main() {
  local mode="${1:-help}"
  local maybe_reset="${2:-}"

  case "$mode" in
    setup)
      if [[ "$maybe_reset" == "--reset" ]]; then
        setup 1
      else
        setup 0
      fi
      ;;
    happy)
      run_happy_path
      ;;
    refund)
      run_refund_path
      ;;
    balances)
      bootstrap_env
      ensure_replica
      assert_chain_ready
      print_balances "${@:2}"
      ;;
    verify)
      bootstrap_env
      ensure_replica
      assert_chain_ready
      "$ROOT_DIR/scripts/validate_chain.sh" "${@:2}"
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "Unknown mode: $mode" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
