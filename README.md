# cygnus-sdk

The TypeScript client for Cygnus, a humanitarian aid disbursement protocol on
Stellar's Soroban platform. It wraps the programme contract with typed methods,
builds and verifies Merkle disbursement batches, fixes the hashing conventions
that every party must share, and defines the anchor interface for last-mile
payouts.

This is the SDK repository, the middle of three:

- [cygnus-contracts](https://github.com/Cygnus-aid-disbursement/cygnus-contracts)
  — the Rust contract, deployment truth, and protocol specification.
- **cygnus-sdk** (here) — the TypeScript client and the batch and hashing logic.
- [cygnus-app](https://github.com/Cygnus-aid-disbursement/cygnus-app) — the
  public dashboard and implementer console.

Dependencies point one way: contracts, then SDK, then app. This package depends
on the contract's published interface and deployment; it never imports app code.
See [docs/multi-repo.md](docs/multi-repo.md).

## What the chain proves, and what it does not

Cygnus records that funds moved from one party to another under a stated rule. It
does not prove that goods were delivered or that the right people received aid. A
disbursement batch commits to a list of payouts with a Merkle root and says money
left the programme for that many recipients totalling that amount; it cannot say
those recipients received anything of value. Any interface built on this SDK must
carry that distinction. The batch API deliberately never accepts or exposes a raw
beneficiary identifier.

## Compatibility

The major version tracks protocol compatibility. Before 1.0, breaking changes may
land in minor versions, and this table is the source of truth.

| SDK version | Protocol version | Testnet | Mainnet |
|---|---|---|---|
| 0.1.x | v0.1.0 | yes | no |

## Install

The package is published to GitHub Packages under the organisation scope. Point
the scope at that registry and authenticate with a token that has `read:packages`:

```
# .npmrc
@cygnus-aid-disbursement:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
pnpm add @cygnus-aid-disbursement/sdk
```

The scope is `@cygnus-aid-disbursement` rather than a bare `@cygnus` because
GitHub Packages requires the scope to match the owning organisation.

## Usage

```ts
import {
  Cygnus,
  buildBatch,
  inclusionProof,
  hashProgrammeMetadata,
} from "@cygnus-aid-disbursement/sdk";

// Read the public record. No key needed.
const cygnus = new Cygnus({ network: "testnet" });
const programme = await cygnus.getProgramme(0n);

// Build a disbursement batch. recipientRef is salted for you; a raw identifier
// never enters a leaf.
const salt = crypto.getRandomValues(new Uint8Array(16));
const batch = buildBatch(
  [
    { reference: "case-1001", amount: 50_0000000n },
    { reference: "case-1002", amount: 50_0000000n },
  ],
  salt,
);
// Publish batch.root, batch.total, batch.count on chain via disburse().
// Give each beneficiary their leaf and inclusionProof(batch, i) as a receipt.

// Verify a receipt against the on-chain root.
const ok = await cygnus.verifyInclusion(0n, 0, batch.leaves[0], inclusionProof(batch, 0));
```

Write calls return an `AssembledTransaction`; configure `publicKey` and
`signTransaction` on the client and call `.signAndSend()`.

## Contract bindings

`src/generated/index.ts` is generated from the deployed contract's interface and
committed so consumers need no build-time codegen. Regenerate it after a contract
change and redeploy:

```bash
pnpm bindings
```

The vendored deployment truth is `src/deployments.json`, copied from the
contract repository and exported as `deployments`. Never hardcode a contract id
downstream; read it from there.

## Development

```bash
pnpm install
pnpm test        # unit tests, no network
pnpm typecheck
pnpm build
```

The Testnet cross-check in `test/integration.test.ts` runs only when
`STELLAR_SECRET` holds a funded Testnet key. It creates a programme, disburses an
SDK-built batch, and confirms the contract verifies every leaf. Run it with:

```bash
STELLAR_SECRET=S... pnpm test
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Open work is in [ISSUES.md](ISSUES.md).
Report security issues privately per [SECURITY.md](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
