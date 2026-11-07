import { describe, expect, it } from "vitest";
import { sha256 } from "@noble/hashes/sha256";
import {
  buildBatch,
  hashLeaf,
  hashNode,
  inclusionProof,
  saltRecipientRef,
  verifyProof,
  amountToBe16,
} from "../src/batch.js";

const SALT = new TextEncoder().encode("programme-42-salt");

describe("buildBatch and inclusion proofs", () => {
  for (const n of [1, 2, 3, 5, 8, 50]) {
    it(`every leaf verifies for a batch of ${n}`, () => {
      const entries = Array.from({ length: n }, (_, i) => ({
        reference: `beneficiary-${i}`,
        amount: BigInt(10 + i),
      }));
      const batch = buildBatch(entries, SALT);
      expect(batch.count).toBe(n);
      expect(batch.total).toBe(entries.reduce((s, e) => s + e.amount, 0n));
      for (let i = 0; i < n; i++) {
        const proof = inclusionProof(batch, i);
        expect(verifyProof(batch.leaves[i], proof, batch.root)).toBe(true);
      }
    });
  }

  it("rejects a tampered proof and a tampered leaf", () => {
    const batch = buildBatch(
      Array.from({ length: 6 }, (_, i) => ({ reference: `b${i}`, amount: 5n })),
      SALT,
    );
    const proof = inclusionProof(batch, 2);
    const badProof = [...proof];
    badProof[0] = Buffer.from(sha256(Buffer.from("wrong")));
    expect(verifyProof(batch.leaves[2], badProof, batch.root)).toBe(false);

    const wrongLeaf = hashLeaf(batch.recipientRefs[2], 999n);
    expect(verifyProof(wrongLeaf, proof, batch.root)).toBe(false);
  });

  it("empty batch throws", () => {
    expect(() => buildBatch([], SALT)).toThrow();
  });

  it("empty salt throws", () => {
    expect(() => buildBatch([{ reference: "a", amount: 10n }], new Uint8Array(0))).toThrow(
      "salt must not be empty",
    );
  });

  it("negative amount throws RangeError", () => {
    expect(() => buildBatch([{ reference: "a", amount: -5n }], SALT)).toThrow(RangeError);
  });
});

describe("encoding matches the on-chain-validated demo vector", () => {
  // These leaves reproduce the demo batch that the deployed contract accepted
  // (scripts/demo.sh, verify_inclusion returned true). Reproducing its root here
  // proves the SDK's leaf and node encoding matches the contract byte for byte.
  it("reproduces the demo root for 50 leaves of 12", () => {
    const leaves = Array.from({ length: 50 }, (_, i) =>
      hashLeaf(Buffer.from(sha256(Buffer.from(`cygnus-demo-salt:beneficiary:${i}`, "utf8"))), 12n),
    );
    let level = leaves;
    while (level.length > 1) {
      const next: Buffer[] = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(i + 1 < level.length ? hashNode(level[i], level[i + 1]) : level[i]);
      }
      level = next;
    }
    expect(level[0].toString("hex")).toBe(
      "9ff7668509b1bea2e6d98749045844906b94ad275dce24dbe2105418456c0446",
    );
  });
});

describe("amountToBe16", () => {
  it("encodes small positives as 16-byte big-endian", () => {
    expect(amountToBe16(12n).toString("hex")).toBe("0000000000000000000000000000000c");
  });
  it("encodes zero as 16 zero bytes", () => {
    expect(amountToBe16(0n).toString("hex")).toBe("00000000000000000000000000000000");
  });
  it("encodes negative amounts using two's complement", () => {
    expect(amountToBe16(-1n).toString("hex")).toBe("ffffffffffffffffffffffffffffffff");
  });
  it("throws RangeError if amount exceeds i128 range", () => {
    const overflow = 1n << 127n;
    expect(() => amountToBe16(overflow)).toThrow(RangeError);
    const underflow = -(1n << 127n) - 1n;
    expect(() => amountToBe16(underflow)).toThrow(RangeError);
  });
  it("salted recipient reference is 32 bytes", () => {
    expect(saltRecipientRef("x", SALT).length).toBe(32);
  });

  it("elevates odd-tail nodes without duplicating leaves across levels", () => {
    // 3 leaves: leaf0, leaf1, leaf2
    // Level 0: [leaf0, leaf1, leaf2]
    // Level 1: [hashNode(leaf0, leaf1), leaf2] (tail node carried up)
    // Level 2: [hashNode(hashNode(leaf0, leaf1), leaf2)] (root)
    const entries = [
      { reference: "r0", amount: 10n },
      { reference: "r1", amount: 20n },
      { reference: "r2", amount: 30n },
    ];
    const b = buildBatch(entries, SALT);
    const n01 = hashNode(b.leaves[0], b.leaves[1]);
    const expectedRoot = hashNode(n01, b.leaves[2]);
    expect(b.root.toString("hex")).toBe(expectedRoot.toString("hex"));

    // Inclusion proof for leaf 2 should only have 1 sibling (n01)
    const proof2 = inclusionProof(b, 2);
    expect(proof2.length).toBe(1);
    expect(proof2[0].toString("hex")).toBe(n01.toString("hex"));
  });
});
