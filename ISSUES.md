# Open issues — cygnus-sdk

Unclaimed work in this repository, ordered easiest to hardest, with difficulty
labels matching `CONTRIBUTING.md`: `good first issue`, `intermediate`,
`advanced`. This list is the source of truth for what is open; `CONTRIBUTING.md`
mirrors it. To claim one, comment on the matching GitHub issue.

The largest unclaimed piece here is **anchor payouts** (#6, #7): a real
implementation of the anchor interface against a live Testnet anchor.

---

## 1. Add a `fromEnv` constructor — `good first issue`

A UI or script often configures the client from environment variables. Add a
static helper that reads network, contract id, and RPC URL from the environment.

**Acceptance criteria**
- `Cygnus.fromEnv()` reads `CYGNUS_NETWORK`, `CYGNUS_CONTRACT_ID`, and
  `CYGNUS_RPC_URL`, falling back to the vendored deployment.
- A unit test covers defaults and overrides.

## 2. Add a programme view normaliser — `good first issue`

The contract returns `bigint` amounts and tagged-union enums. UIs want a plainer
shape.

**Acceptance criteria**
- A pure function turns a `Programme` into a display shape (strings for amounts,
  simple status strings) without losing precision.
- Unit tests over each milestone status and approver kind.

## 3. Event streaming helper — `intermediate`

`Cygnus.events` fetches a single page from a start ledger. A dashboard needs
paging and a way to resume from the last seen ledger.

**Acceptance criteria**
- An async iterator or callback API that pages through events and resumes from a
  cursor.
- Handles an empty range and a range past the ledger head without throwing.

## 4. Batch receipt format — `intermediate`

A beneficiary receipt is a leaf plus an inclusion proof plus enough context to
verify it. Define a serialisable format and a reader.

**Acceptance criteria**
- A documented JSON receipt containing programme id, batch index, leaf, proof,
  and amount.
- `writeReceipt` and `verifyReceipt` helpers, the latter calling the contract.
- Round-trip unit tests plus a Testnet check under the integration gate.

## 5. RPC retry and backoff — `intermediate`

Testnet rate-limits and resets. Read calls should retry transient failures with
backoff rather than throwing on the first error.

**Acceptance criteria**
- A configurable retry wrapper applied to read calls.
- A unit test with a mocked transport proves backoff and a final failure.

## 6. Anchor reference implementation — `advanced`

`src/anchor.ts` ships the `Anchor` interface and a `StubAnchor`. Implement it
against a live Testnet anchor: quote, initiate payout, and poll status. This is
the single largest piece here.

**Acceptance criteria**
- One working implementation against a named Testnet anchor.
- Clear documentation for adding another anchor.
- Integration tests gated behind the anchor's credentials.

## 7. SEP-10 auth and SEP-24 flow — `advanced`

The anchor reference needs authentication (SEP-10) and, for interactive rails,
SEP-24 deposit and withdraw handling.

**Acceptance criteria**
- SEP-10 challenge and token handling.
- A SEP-24 interactive flow helper, documented, with a Testnet integration test.

## 8. Client support for panel and oracle approvers — `advanced`

When the contract gains panel and oracle approvers (cygnus-contracts #6 and #7),
the SDK needs typed helpers for multi-party approval and attestation production.

**Acceptance criteria**
- Types and helpers matching the contract's panel and oracle calls.
- The Merkle and hashing cross-check stays green.
- Landed in a pull request linked to the contract pull request.
