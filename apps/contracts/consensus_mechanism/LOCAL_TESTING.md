# Local ICP Testing

Run these commands from WSL inside:

```bash
cd /mnt/c/Users/ivan2/Documents/GitHub/HackTues12/apps/contracts/consensus_mechanism
```

## Fast Path

Use the runner for a persistent local dev chain, real local ICP balances, and the validated post-approval funding flow plus funding guardrails:

```bash
bash scripts/local_dev_chain.sh setup --reset
bash scripts/local_dev_chain.sh happy
bash scripts/local_dev_chain.sh guardrails
bash scripts/local_dev_chain.sh balances investor1 community1
bash scripts/local_dev_chain.sh verify 1 happy investor1 community1
bash scripts/local_dev_chain.sh verify 2 guardrails investor1 community2
```

`happy` performs the real ledger-backed payout flow:
- community vote passes
- investor approves the canister with `icrc2_approve`
- `fund_proposal` pulls ICP into the proposal escrow subaccount
- `release_escrow` transfers ICP to the beneficiary

`guardrails` verifies the new post-approval funding restrictions:
- `fund_proposal` fails while the proposal is still `Active`
- the proposal is rejected by community voting
- `fund_proposal` still fails after rejection
- no escrow funding record is created

## Manual Setup

If you want to step through the real flow manually:

```bash
bash scripts/local_dev_chain.sh setup --reset
```

That command:
- starts the local system-subnet network
- installs the local NNS and ICP ledger
- funds the test identities with local ICP
- deploys the consensus canister
- registers the mock community and investor users
- shortens the voting window to 30 seconds
- stores the noisy setup logs under `.dfx/codex-logs`

Check balances any time with:

```bash
bash scripts/local_dev_chain.sh balances investor1 community1
dfx --identity investor1 ledger balance
dfx --identity community1 ledger balance
dfx --identity investor1 ledger account-id
dfx --identity community1 ledger account-id
```

Validate votes, audit events, escrow state, block indexes, and balances with:

```bash
bash scripts/validate_chain.sh 1 happy investor1 community1
bash scripts/validate_chain.sh 2 guardrails investor1 community2
```


## Manual Happy Path

### 1. Submit the proposal

```bash
dfx identity use community1
BENEFICIARY=$(dfx identity get-principal)

dfx canister call consensus_mechanism submit_proposal "(record {
  title = \"Community cultural festival\";
  description = \"Fund a local tourism event with volunteers and local artists.\";
  budget_description = \"Stage, permits, local marketing\";
  region_tag = \"sofia\";
  beneficiary = principal \"$BENEFICIARY\";
  requested_funding_e8s = 100000000;
})"
```

### 2. Vote and finalize

```bash
dfx identity use community1
dfx canister call consensus_mechanism submit_vote '(record { proposal_id = 1; in_favor = true; })'

dfx identity use community2
dfx canister call consensus_mechanism submit_vote '(record { proposal_id = 1; in_favor = true; })'

dfx identity use community3
dfx canister call consensus_mechanism submit_vote '(record { proposal_id = 1; in_favor = false; })'

sleep 35

dfx identity use community1
dfx canister call consensus_mechanism finalize_proposal '(1)'
```

### 3. Inspect the escrow wallet

```bash
dfx canister call consensus_mechanism get_proposal_escrow_account '(1)'
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai icrc1_fee '()'
```

The escrow account view includes:
- the escrow subaccount hex
- the account-id hex
- the requested amount
- the transfer fee
- the suggested total deposit

### 4. Approve the canister to pull funds

For the local ledger, the fee is usually `10000` e8s. For a `1 ICP` funding request:
- funding amount: `100000000`
- transfer fee: `10000`
- escrow pull amount: `100010000`
- safe approval amount: `100020000`

```bash
CONSENSUS_ID=$(dfx canister id consensus_mechanism)

dfx identity use investor1
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai icrc2_approve "(record {
  fee = opt 10000;
  memo = null;
  from_subaccount = null;
  created_at_time = null;
  amount = 100020000;
  expected_allowance = null;
  expires_at = null;
  spender = record {
    owner = principal \"$CONSENSUS_ID\";
    subaccount = null;
  };
})"
```

### 5. Pull the funds into escrow

```bash
dfx identity use investor1
dfx canister call consensus_mechanism fund_proposal '(record {
  proposal_id = 1;
  amount_e8s = 100000000;
  deposit_block_index = null;
  deposit_reference = opt "manual-happy-deposit-1";
})'
```

### 6. Release funds to the beneficiary

```bash
dfx identity use community1
dfx canister call consensus_mechanism release_escrow '(record {
  proposal_id = 1;
  reference = opt "manual-happy-release-1";
})'
```

### 7. Verify state and balances

```bash
dfx canister call consensus_mechanism get_proposal_view '(1)'
dfx canister call consensus_mechanism list_votes '(1)'
dfx canister call consensus_mechanism list_audit_events '(opt 1)'
bash scripts/local_dev_chain.sh balances investor1 community1
```

Expected outcome:
- investor balance decreases by the funded amount plus ledger fees
- beneficiary balance increases by the funded amount
- escrow state becomes `Released`

## Manual Guardrail Path

### 1. Submit a proposal that will fail

```bash
dfx identity use community2
BENEFICIARY=$(dfx identity get-principal)

dfx canister call consensus_mechanism submit_proposal "(record {
  title = \"Low support test\";
  description = \"This one should fail before any NPO funding is allowed.\";
  budget_description = \"Mock budget only\";
  region_tag = \"sofia\";
  beneficiary = principal \"$BENEFICIARY\";
  requested_funding_e8s = 50000000;
})"
```

### 2. Confirm funding is blocked before approval

```bash
dfx identity use investor1
dfx canister call consensus_mechanism fund_proposal '(record {
  proposal_id = 2;
  amount_e8s = 50000000;
  deposit_block_index = null;
  deposit_reference = opt "manual-guardrail-active-2";
})'
```

Expected result:
- call fails with `Cannot fund a proposal before it passes community voting`

### 3. Reject the proposal and confirm funding is still blocked

```bash
dfx identity use community1
dfx canister call consensus_mechanism submit_vote '(record { proposal_id = 2; in_favor = false; })'

dfx identity use community2
dfx canister call consensus_mechanism submit_vote '(record { proposal_id = 2; in_favor = false; })'

sleep 35

dfx identity use community1
dfx canister call consensus_mechanism finalize_proposal '(2)'

dfx identity use investor1
dfx canister call consensus_mechanism fund_proposal '(record {
  proposal_id = 2;
  amount_e8s = 50000000;
  deposit_block_index = null;
  deposit_reference = opt "manual-guardrail-rejected-2";
})'
```

Expected result:
- call fails with `Cannot fund a proposal that has already failed voting`

### 4. Verify rejected state and unchanged balances

```bash
dfx canister call consensus_mechanism get_proposal_view '(2)'
dfx canister call consensus_mechanism list_audit_events '(opt 2)'
bash scripts/local_dev_chain.sh balances investor1 community2
```

Expected outcome:
- no escrow is created
- investor balance does not decrease for proposal funding
- beneficiary balance does not increase
- proposal status becomes `Rejected`

## Reset

If you want a clean local network again:

```bash
bash scripts/local_dev_chain.sh setup --reset
```
