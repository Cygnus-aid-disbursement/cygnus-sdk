# Open Issues & Future Roadmap

This document outlines the planned future roadmap (~10% remaining post-v0.1.0) for `@cygnus-aid-disbursement/sdk`. Each issue includes difficulty tiers, area tags, and concrete acceptance criteria for contributors and reviewers.

Unclaimed work is also mirrored in GitHub Issues:
https://github.com/Cygnus-aid-disbursement/cygnus-sdk/issues

---

### Issue 1: SEP-24 Interactive Anchor Payout Flow
- **Labels**: `advanced`, `area:anchor`
- **Context**: The SDK currently ships `StubAnchor` and `MemoryAnchor`. A live production anchor implementation requires interactive web authentication (SEP-10 JWT) and interactive deposit/withdrawal flows (SEP-24).
- **Scope**:
  - Implement `Sep24Anchor` implementing the `Anchor` interface.
  - Implement SEP-10 challenge transaction signing and JWT bearer token acquisition.
  - Handle interactive URL opening for KYC and collection of recipient payment credentials out-of-band.
- **Acceptance Criteria**:
  - Validated against a live Stellar Testnet anchor supporting SEP-24 / SEP-38.
  - Maintains strict recipient privacy: never submits raw beneficiary identifiers to public endpoints.

---

### Issue 2: Multisig Panel and Oracle Approver Client Helpers
- **Labels**: `advanced`, `area:contracts`
- **Context**: The smart contract architecture specifies `Panel` (M-of-N multisig) and `Oracle` approver configurations alongside the single-key approver.
- **Scope**:
  - Add client helpers to assemble, collect, and combine multiple approver signatures on milestone approval transactions.
  - Add typed data structures for oracle attestations verifying milestone completion evidence.
- **Acceptance Criteria**:
  - Panel approval transactions serialize cleanly and execute successfully on Soroban simulation.
  - Comprehensive unit tests covering M-of-N threshold validation and duplicate signer rejections.

---

### Issue 3: CLI Utility for Offline Batch Building & Receipt Verification
- **Labels**: `intermediate`, `area:cli`
- **Context**: Implementers in the field often operate in air-gapped or low-connectivity environments where running a custom Node script is inconvenient.
- **Scope**:
  - Create a lightweight CLI (`cygnus-cli`) wrapping `buildBatch`, `verifyReceipt`, and `saltRecipientRef`.
  - Accept CSV or JSON inputs of beneficiary references and payout amounts.
  - Output Merkle root, total, count, and individual `receipt.json` files.
- **Acceptance Criteria**:
  - CLI runs under Node 20+ without external native dependencies.
  - `cygnus verify-receipt <receipt.json> --root <hex>` returns exit code 0 on valid proof.

---

### Issue 4: Event Webhook Dispatch Daemon
- **Labels**: `intermediate`, `area:streaming`
- **Context**: Integrating applications require HTTP webhook callbacks when milestones are approved or disbursements settle on-chain.
- **Scope**:
  - Build a persistent webhook runner consuming `subscribeToEvents`.
  - Provide exponential backoff delivery retries with persistent cursor state stored in SQLite or filesystem.
- **Acceptance Criteria**:
  - Webhooks survive process restarts without skipping or duplicating events.
  - Unit tests verifying cursor recovery from saved ledger checkpoints.
