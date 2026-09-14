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
  it("salted recipient reference is 32 bytes", () => {
    expect(saltRecipientRef("x", SALT).length).toBe(32);
  });
});
