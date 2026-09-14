# Contributing to cygnus-sdk

Welcome. This repository is the TypeScript client for Cygnus, and a first-time
contributor who has never touched Stellar should be able to read this file and
open a useful pull request the same day. If anything here is unclear, that is a
bug in this document; please say so.

## What this repository is, and the other two

Cygnus is a humanitarian aid disbursement protocol. A sponsor funds a programme,
an implementer claims funds against milestones, an approver releases each
milestone budget, and the implementer disburses to beneficiaries in batches that
are publicly auditable without naming anyone. This package is how applications
talk to that protocol.

Cygnus ships as three repositories:

- [cygnus-contracts](https://github.com/Cygnus-aid-disbursement/cygnus-contracts)
  — the Rust programme contract and the normative protocol specification.
- **cygnus-sdk** (this one) — the typed client, Merkle batch construction, and
  the hashing conventions every party shares.
- [cygnus-app](https://github.com/Cygnus-aid-disbursement/cygnus-app) — the
  public dashboard and the implementer console.

Dependencies point one way: **contracts, then SDK, then app, never reversed.**
This package depends on the contract's published interface and deployment; it
never imports application code. See [docs/multi-repo.md](docs/multi-repo.md).

## The domain in two minutes

Four ideas carry most of the design:

- **Programme.** A funded agreement with a sponsor, an implementer, an approver,
  and milestones. Funds sit in the contract, never in a platform account.
- **Milestone.** A unit of work with an amount and a due date. Claimed with an
  evidence hash, then approved or rejected.
- **Disbursement batch.** A payout to many beneficiaries, published as a Merkle
  root, a total, and a count. Individual payouts never go on chain, and this SDK
  is where the batch is built and the recipient reference is salted.
- **What the chain proves.** That funds moved under a stated rule. Not that goods
  arrived or that the right people were paid. Never build an API that implies the
  second.

The contract's `docs/protocol.md` is the normative document for on-chain
behaviour. This repository's `docs/hashing.md` specifies how documents become
hashes. Code follows both.

## Repository map

```
src/
  client.ts        the Cygnus class: typed methods, waitForState, events
  batch.ts         Merkle leaf and node hashing, root, proofs, verification
  hashing.ts       canonical JSON and document-hash helpers
  anchor.ts        the Anchor interface and a NotImplemented stub
  deployments.ts   exports the vendored deployment truth
  deployments.json vendored from cygnus-contracts (generated; see below)
  generated/       GENERATED contract bindings; do not edit by hand
test/
  batch.test.ts        Merkle unit tests, no network
  hashing.test.ts      hashing unit tests, no network
  integration.test.ts  Testnet cross-check, gated on STELLAR_SECRET
scripts/
  generate-bindings.mjs  regenerates src/generated/index.ts
  copy-assets.mjs        copies deployments.json into dist during build
docs/
  hashing.md      the hashing specification
  multi-repo.md   the three-repository contract
```

Regenerate the generated pieces with `pnpm bindings`. That refreshes
`src/generated/index.ts` from the deployed contract's interface. Re-add the
`GENERATED` banner at the top afterwards.

## Getting set up

Prerequisites:

- Node 20 or later.
- pnpm 9 or later (`corepack enable` gives you a matching pnpm).
- The [Stellar CLI](https://developers.stellar.org/docs/tools/cli) 27 or later,
  only if you regenerate bindings or run the Testnet cross-check.

From a clone to a passing test run:

```bash
pnpm install
pnpm test        # unit tests, no network, no deployment of your own
pnpm typecheck
pnpm build
```

`pnpm test` runs the Merkle and hashing suites with no network. That is the
fastest proof your setup works. `pnpm build` compiles to `dist` and copies the
vendored deployment beside it.

To run the Testnet cross-check you need a funded key:

```bash
stellar keys generate cygnus-tester --network testnet --fund
STELLAR_SECRET=$(stellar keys show cygnus-tester) pnpm test
```

That test creates a programme, disburses an SDK-built batch, and confirms the
contract verifies every leaf. It is skipped without `STELLAR_SECRET`.

## Where to start

Issues carry one of three difficulty labels: `good first issue`, `intermediate`,
`advanced`, plus area labels. The full list with acceptance criteria lives in
[ISSUES.md](ISSUES.md); it and this section are kept in step.

1. **Add a `fromEnv` constructor** — `good first issue`. Configure the client
   from environment variables.
2. **Add a programme view normaliser** — `good first issue`. Turn contract types
   into a display shape.
3. **Event streaming helper** — `intermediate`. Page and resume over contract
   events.
4. **Batch receipt format** — `intermediate`. A serialisable beneficiary receipt
   and a verifier.
5. **RPC retry and backoff** — `intermediate`. Survive Testnet rate limits.
6. **Anchor reference implementation** — `advanced`. The single largest piece;
   a real anchor against a Testnet rail.
7. **SEP-10 auth and SEP-24 flow** — `advanced`.
8. **Client support for panel and oracle approvers** — `advanced`. Tracks the
   contract's approver work.

To claim an issue, comment on it. For anything that changes the Merkle or hashing
conventions, open a discussion first; it must move with the contract.

## Rules that matter here

A reviewer will send a pull request back for any of these:

- **The Merkle construction matches the contract.** `src/batch.ts` and the
  contract's `verify_inclusion` are one specification in two languages. Change
  them together and update the cross-check test.
- **Salting is the only path to a recipient reference.** No API may accept or
  emit a raw beneficiary identifier; `saltRecipientRef` produces the salted form.
- **No hardcoded contract ids.** Read deployment truth from `deployments`.
- **Amounts are `bigint` stroops.** No `number` for money; it loses precision.
- **No wording implies delivery.** Types, comments, and docs must not suggest the
  chain proves goods arrived or that recipients received aid.

## Code style

TypeScript, formatted with Prettier, type-checked with `tsc`, tested with Vitest.
Commits follow [Conventional Commits](https://www.conventionalcommits.org):
`feat:`, `fix:`, `docs:`, `test:`, `chore:`. Branch names read like
`feat/event-streaming` or `fix/proof-ordering`.

CI runs exactly these, and they must pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Pull request checklist

- [ ] `pnpm lint` is clean.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` succeeds.
- [ ] New or changed behaviour has unit tests; network-dependent behaviour is
      behind the `STELLAR_SECRET` gate.
- [ ] If the Merkle or hashing conventions changed, the contract change is linked
      and the cross-check test is updated.
- [ ] The compatibility table in `README.md` is updated if protocol compatibility
      changed.
- [ ] Any dependent pull request in another repository is linked.

## Releases

Maintainers cut releases. The SDK uses semantic versioning on GitHub Packages;
the major version tracks protocol compatibility, and the README table is the
source of truth. Contributors must not bump the version or edit
`src/deployments.json` by hand in a feature pull request; both are part of the
release flow in docs/multi-repo.md.

## Security

Report vulnerabilities privately per [SECURITY.md](SECURITY.md), never in a
public issue. The sensitive surfaces here are the Merkle construction, recipient
salting, the hashing conventions, and the vendored deployment truth. This project
is unaudited and Testnet only.

## Community

Design discussion happens in GitHub Discussions. Two merged pull requests earn
triage rights on request. Commit rights on the SDK are granted after a track
record of merged work; changes that touch the Merkle or hashing conventions get
closer review because they move in lockstep with the contract. Keep pull requests
small so they can be reviewed quickly.
