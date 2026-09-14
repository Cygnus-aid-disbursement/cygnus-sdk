# Security policy

Cygnus is unaudited and Testnet only. There is no mainnet configuration. Do not
use it to move real value.

## Reporting a vulnerability

Report privately to **security@cygnus-aid.org**. Do not open a public issue for a
suspected vulnerability. Include what you did, what you observed, and how to
reproduce it. We will acknowledge and keep you updated, and we ask for reasonable
time to fix before public disclosure.

## Sensitive surfaces in this repository

- **Merkle construction.** `src/batch.ts` must match the contract's
  `verify_inclusion` byte for byte. A mismatch breaks every inclusion proof; a
  flaw in domain separation could allow a forged one. Change it only alongside
  the contract, with the cross-check test updated.
- **Recipient salting.** `saltRecipientRef` is the only supported path to a
  recipient reference. A change that lets a raw beneficiary identifier reach a
  leaf is a privacy breach. Beneficiary privacy is a core invariant, not a
  feature to trade away.
- **Hashing conventions.** `src/hashing.ts` fixes how documents become on-chain
  hashes. A silent change breaks every auditor who relies on reproducing them.
- **Deployment truth.** `src/deployments.json` is vendored from the contract
  repository. Editing a contract id by hand here, rather than through the release
  flow, can point clients at the wrong contract.

## Scope

This policy covers the SDK in this repository. The contract and app carry their
own `SECURITY.md` with the same reporting address.
