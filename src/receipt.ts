import { hashLeaf, inclusionProof, verifyProof, type Batch } from "./batch.js";

/** Portable, verifiable receipt given to a beneficiary as proof of inclusion. */
export interface BeneficiaryReceipt {
  version: "1";
  programmeId: string;
  batchIndex: number;
  recipientRefHex: string;
  amount: string;
  leafHex: string;
  proofHex: string[];
  rootHex: string;
  createdAtIso?: string;
}

/**
 * Construct a portable, verifiable BeneficiaryReceipt for a recipient in a disbursement batch.
 */
export function createReceipt(args: {
  programmeId: bigint;
  batchIndex: number;
  entryIndex: number;
  batch: Batch;
  amount: bigint;
  createdAtIso?: string;
}): BeneficiaryReceipt {
  const { programmeId, batchIndex, entryIndex, batch, amount } = args;
  if (entryIndex < 0 || entryIndex >= batch.leaves.length) {
    throw new RangeError(`entryIndex ${entryIndex} out of batch range [0, ${batch.leaves.length})`);
  }

  const recipientRef = batch.recipientRefs[entryIndex];
  const leaf = batch.leaves[entryIndex];
  const expectedLeaf = hashLeaf(recipientRef, amount);
  if (!leaf.equals(expectedLeaf)) {
    throw new Error("Specified amount does not match batch leaf at entryIndex");
  }

  const proof = inclusionProof(batch, entryIndex);

  return {
    version: "1",
    programmeId: programmeId.toString(),
    batchIndex,
    recipientRefHex: recipientRef.toString("hex"),
    amount: amount.toString(),
    leafHex: leaf.toString("hex"),
    proofHex: proof.map((p) => p.toString("hex")),
    rootHex: batch.root.toString("hex"),
    createdAtIso: args.createdAtIso ?? new Date().toISOString(),
  };
}

/**
 * Verify a BeneficiaryReceipt cryptographically offline.
 * Recomputes the leaf from the salted recipientRef and amount, and folds the Merkle proof.
 */
export function verifyReceipt(receipt: BeneficiaryReceipt, expectedRootHex?: string): boolean {
  if (!receipt || receipt.version !== "1") return false;
  if (!receipt.recipientRefHex || receipt.recipientRefHex.length !== 64) return false;
  if (!receipt.leafHex || receipt.leafHex.length !== 64) return false;
  if (!receipt.rootHex || receipt.rootHex.length !== 64) return false;
  if (!Array.isArray(receipt.proofHex)) return false;

  if (expectedRootHex && receipt.rootHex.toLowerCase() !== expectedRootHex.toLowerCase()) {
    return false;
  }

  try {
    const recipientRef = Buffer.from(receipt.recipientRefHex, "hex");
    const amount = BigInt(receipt.amount);
    const computedLeaf = hashLeaf(recipientRef, amount);
    if (!computedLeaf.equals(Buffer.from(receipt.leafHex, "hex"))) {
      return false;
    }

    const leaf = Buffer.from(receipt.leafHex, "hex");
    const proof = receipt.proofHex.map((p) => Buffer.from(p, "hex"));
    const root = Buffer.from(receipt.rootHex, "hex");

    return verifyProof(leaf, proof, root);
  } catch {
    return false;
  }
}

/** Serialize receipt to formatted JSON string. */
export function receiptToJson(receipt: BeneficiaryReceipt): string {
  return JSON.stringify(receipt, null, 2);
}

/** Parse and validate a BeneficiaryReceipt JSON string. */
export function receiptFromJson(json: string): BeneficiaryReceipt {
  const parsed = JSON.parse(json);
  if (
    !parsed ||
    parsed.version !== "1" ||
    typeof parsed.programmeId !== "string" ||
    typeof parsed.batchIndex !== "number" ||
    typeof parsed.recipientRefHex !== "string" ||
    typeof parsed.amount !== "string" ||
    typeof parsed.leafHex !== "string" ||
    !Array.isArray(parsed.proofHex) ||
    typeof parsed.rootHex !== "string"
  ) {
    throw new TypeError("Invalid BeneficiaryReceipt JSON schema");
  }
  return parsed as BeneficiaryReceipt;
}
