import { sha256 } from "@noble/hashes/sha256";

// Merkle batch construction. This must match the contract's merkle.rs byte for
// byte; the cross-check test runs the on-chain verify_inclusion against proofs
// built here. See docs/protocol.md section 5 for the normative encoding.

const LEAF_DOMAIN = 0x00;
const NODE_DOMAIN = 0x01;

/** One payout. `reference` is an opaque beneficiary reference, never published. */
export interface BatchEntry {
  reference: string;
  amount: bigint;
}

export interface Batch {
  root: Buffer;
  total: bigint;
  count: number;
  // Salted recipient references, in the order they were hashed into leaves.
  recipientRefs: Buffer[];
  leaves: Buffer[];
}

/**
 * Salt a beneficiary reference into a 32-byte recipient reference.
 *
 * recipientRef = sha256( salt || utf8(reference) )
 *
 * Salting per programme stops the same person being correlated across
 * programmes. A raw identifier must never be used as a leaf input, which is why
 * this is the only exported path to a recipient reference.
 */
export function saltRecipientRef(reference: string, salt: Uint8Array): Buffer {
  const ref = new TextEncoder().encode(reference);
  const buf = new Uint8Array(salt.length + ref.length);
  buf.set(salt, 0);
  buf.set(ref, salt.length);
  return Buffer.from(sha256(buf));
}

/** 16-byte big-endian two's-complement encoding of an i128 amount. */
export function amountToBe16(amount: bigint): Buffer {
  const b = Buffer.alloc(16);
  let v = amount < 0n ? (1n << 128n) + amount : amount;
  for (let i = 15; i >= 0; i--) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

/** leaf = sha256( 0x00 || recipientRef[32] || amount_be[16] ) */
export function hashLeaf(recipientRef: Buffer, amount: bigint): Buffer {
  if (recipientRef.length !== 32) {
    throw new Error("recipientRef must be 32 bytes");
  }
  return Buffer.from(
    sha256(Buffer.concat([Buffer.from([LEAF_DOMAIN]), recipientRef, amountToBe16(amount)])),
  );
}

/** node = sha256( 0x01 || min(a,b) || max(a,b) ), children sorted by byte value. */
export function hashNode(a: Buffer, b: Buffer): Buffer {
  const [lo, hi] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return Buffer.from(sha256(Buffer.concat([Buffer.from([NODE_DOMAIN]), lo, hi])));
}

function levels(leaves: Buffer[]): Buffer[][] {
  const out: Buffer[][] = [leaves];
  let level = leaves;
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      // An odd tail node is carried up unchanged, never duplicated; duplicating
      // it would let a prover forge a second inclusion for that leaf.
      next.push(i + 1 < level.length ? hashNode(level[i], level[i + 1]) : level[i]);
    }
    out.push(next);
    level = next;
  }
  return out;
}

/** Build a batch from entries and a per-programme salt. */
export function buildBatch(entries: BatchEntry[], salt: Uint8Array): Batch {
  if (entries.length === 0) {
    throw new Error("a batch needs at least one entry");
  }
  const recipientRefs = entries.map((e) => saltRecipientRef(e.reference, salt));
  const leaves = recipientRefs.map((ref, i) => hashLeaf(ref, entries[i].amount));
  const root = levels(leaves).at(-1)![0];
  const total = entries.reduce((sum, e) => sum + e.amount, 0n);
  return { root, total, count: entries.length, recipientRefs, leaves };
}

/** Sibling path for a leaf, ordered from the leaf up to the root. */
export function inclusionProof(batch: Batch, index: number): Buffer[] {
  if (index < 0 || index >= batch.leaves.length) {
    throw new Error("leaf index out of range");
  }
  const tree = levels(batch.leaves);
  const proof: Buffer[] = [];
  let idx = index;
  for (let l = 0; l < tree.length - 1; l++) {
    const level = tree[l];
    const sib = idx % 2 === 1 ? idx - 1 : idx + 1;
    if (sib < level.length) proof.push(level[sib]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Fold a proof and test it against a root. Mirrors the contract's verify. */
export function verifyProof(leaf: Buffer, proof: Buffer[], root: Buffer): boolean {
  let acc = leaf;
  for (const sibling of proof) acc = hashNode(acc, sibling);
  return acc.equals(root);
}
