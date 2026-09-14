# Hashing conventions

Cygnus puts hashes on chain, never documents. A programme's metadata, a
milestone's description, a piece of evidence, and a rejection reason all live off
chain; the contract stores only their 32-byte hashes. For an auditor to check
that a document matches its on-chain hash, everyone must compute that hash the
same way. This document is that specification. `src/hashing.ts` implements it.

## Document hashes

A document hash is:

```
sha256( utf8( domain + "\n" + canonicalJson(document) ) )
```

### Canonical JSON

Two documents that are equal as data must serialise to identical bytes, or their
hashes would differ for no reason. Canonical JSON guarantees that:

- Object keys are sorted lexicographically at every level.
- There is no insignificant whitespace.
- Arrays keep their order, since order is meaningful in an array.
- Values use standard JSON encoding for strings, numbers, booleans, and null.

`canonicalJson` in `src/hashing.ts` is the reference. A field client written in
another language must reproduce it exactly.

### Domain separators

Each document type is hashed under a versioned domain separator, so the same
bytes can never be read as a different kind of document, and the scheme can
change without silent collisions:

| Helper | Domain |
|---|---|
| `hashProgrammeMetadata` | `cygnus.programme-metadata.v1` |
| `hashMilestoneDescription` | `cygnus.milestone-description.v1` |
| `hashEvidence` | `cygnus.evidence.v1` |
| `hashRejectionReason` | `cygnus.rejection-reason.v1` |

The domain and the canonical JSON are joined by a single newline before hashing.

## Leaf and node hashing for batches

Disbursement batches use a separate, lower-level encoding described in the
contract's `docs/protocol.md` section 5 and implemented in `src/batch.ts`:

- `leaf = sha256( 0x00 || recipientRef[32] || amount_be[16] )`
- `node = sha256( 0x01 || min(a,b) || max(a,b) )`

The leaf and node domain separators (`0x00`, `0x01`) are single bytes, distinct
from the string domains above, because leaves and nodes are raw bytes rather than
documents. `recipientRef` is always a salted hash of a beneficiary reference,
produced by `saltRecipientRef`; a raw identifier must never be hashed into a
leaf. The SDK's construction and the contract's `verify_inclusion` must change
together, with the cross-check test in `test/integration.test.ts` updated.
