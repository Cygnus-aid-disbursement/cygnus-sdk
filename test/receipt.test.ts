import { describe, expect, it } from "vitest";
import { buildBatch } from "../src/batch.js";
import {
  createBatchReceipts,
  createReceipt,
  receiptFromJson,
  receiptToJson,
  verifyReceipt,
  type BeneficiaryReceipt,
} from "../src/receipt.js";

const SALT = new TextEncoder().encode("receipt-test-salt-1234");

describe("Beneficiary Receipts", () => {
  const entries = [
    { reference: "alice", amount: 100n },
    { reference: "bob", amount: 250n },
    { reference: "charlie", amount: 400n },
  ];
  const batch = buildBatch(entries, SALT);

  it("creates batch receipts for all entries in a batch", () => {
    const receipts = createBatchReceipts({
      programmeId: 10n,
      batchIndex: 2,
      batch,
      amounts: [100n, 250n, 400n],
    });

    expect(receipts.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(verifyReceipt(receipts[i], batch.root.toString("hex"))).toBe(true);
      expect(receipts[i].amount).toBe(entries[i].amount.toString());
    }
  });

  it("throws if amounts count does not match batch leaves count", () => {
    expect(() =>
      createBatchReceipts({
        programmeId: 10n,
        batchIndex: 2,
        batch,
        amounts: [100n], // only 1 amount, but batch has 3 leaves
      }),
    ).toThrow("Amounts count (1) must match batch leaves count (3)");
  });

  it("creates a valid receipt for an entry", () => {
    const receipt = createReceipt({
      programmeId: 42n,
      batchIndex: 0,
      entryIndex: 1,
      batch,
      amount: 250n,
    });

    expect(receipt.version).toBe("1");
    expect(receipt.programmeId).toBe("42");
    expect(receipt.batchIndex).toBe(0);
    expect(receipt.amount).toBe("250");
    expect(receipt.recipientRefHex).toBe(batch.recipientRefs[1].toString("hex"));
    expect(receipt.leafHex).toBe(batch.leaves[1].toString("hex"));
    expect(receipt.rootHex).toBe(batch.root.toString("hex"));
    expect(receipt.proofHex.length).toBeGreaterThan(0);
    expect(receipt.createdAtIso).toBeDefined();

    expect(verifyReceipt(receipt)).toBe(true);
    expect(verifyReceipt(receipt, batch.root.toString("hex"))).toBe(true);
  });

  it("throws when entryIndex is out of range", () => {
    expect(() =>
      createReceipt({
        programmeId: 1n,
        batchIndex: 0,
        entryIndex: 5,
        batch,
        amount: 100n,
      }),
    ).toThrow(RangeError);
  });

  it("throws when specified amount does not match the leaf", () => {
    expect(() =>
      createReceipt({
        programmeId: 1n,
        batchIndex: 0,
        entryIndex: 0,
        batch,
        amount: 9999n, // wrong amount for entry 0 (alice is 100n)
      }),
    ).toThrow("Specified amount does not match batch leaf at entryIndex");
  });

  it("verifyReceipt returns false when expectedRoot does not match", () => {
    const receipt = createReceipt({
      programmeId: 1n,
      batchIndex: 0,
      entryIndex: 0,
      batch,
      amount: 100n,
    });
    expect(verifyReceipt(receipt, "00".repeat(32))).toBe(false);
  });

  it("verifyReceipt detects tampered amount or leaf", () => {
    const receipt = createReceipt({
      programmeId: 1n,
      batchIndex: 0,
      entryIndex: 0,
      batch,
      amount: 100n,
    });

    const tamperedAmount = { ...receipt, amount: "101" };
    expect(verifyReceipt(tamperedAmount)).toBe(false);

    const tamperedRoot = { ...receipt, rootHex: "ab".repeat(32) };
    expect(verifyReceipt(tamperedRoot)).toBe(false);

    const tamperedProof = { ...receipt, proofHex: ["00".repeat(32)] };
    expect(verifyReceipt(tamperedProof)).toBe(false);
  });

  it("serializes and deserializes receipt JSON accurately", () => {
    const receipt = createReceipt({
      programmeId: 7n,
      batchIndex: 3,
      entryIndex: 2,
      batch,
      amount: 400n,
    });

    const json = receiptToJson(receipt);
    const parsed = receiptFromJson(json);
    expect(parsed).toEqual(receipt);
    expect(verifyReceipt(parsed)).toBe(true);
  });

  it("receiptFromJson throws TypeError on malformed JSON schema", () => {
    expect(() => receiptFromJson("{}")).toThrow(TypeError);
    expect(() => receiptFromJson(JSON.stringify({ version: "2" }))).toThrow(TypeError);
    expect(() =>
      receiptFromJson(
        JSON.stringify({
          version: "1",
          programmeId: 123, // should be string
        }),
      ),
    ).toThrow(TypeError);
    expect(() => receiptFromJson("invalid-json{")).toThrow(SyntaxError);
  });

  it("verifyReceipt returns false on invalid or corrupted receipt fields", () => {
    expect(verifyReceipt(null as any)).toBe(false);
    expect(verifyReceipt(undefined as any)).toBe(false);
    expect(verifyReceipt({ version: "2" } as any)).toBe(false);

    const validReceipt = createReceipt({
      programmeId: 1n,
      batchIndex: 0,
      entryIndex: 0,
      batch,
      amount: 100n,
    });

    expect(verifyReceipt({ ...validReceipt, recipientRefHex: "short" })).toBe(false);
    expect(verifyReceipt({ ...validReceipt, leafHex: "short" })).toBe(false);
    expect(verifyReceipt({ ...validReceipt, rootHex: "short" })).toBe(false);
    expect(verifyReceipt({ ...validReceipt, proofHex: "not-an-array" as any })).toBe(false);
  });
});
