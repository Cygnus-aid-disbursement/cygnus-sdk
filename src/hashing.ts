import { sha256 } from "@noble/hashes/sha256";

// Off-chain documents never go on chain; their hashes do. The field client, the
// dashboard, and any external auditor must all produce the same 32 bytes from
// the same document, so hashing is fully specified here and in docs/hashing.md.
//
// A hash is sha256 over a domain separator, a newline, and the canonical JSON of
// the document. The domain separator is versioned per document type so the same
// bytes cannot be reinterpreted as a different kind of document, and so the
// scheme can evolve without silent collisions.

export const DOMAINS = {
  programmeMetadata: "cygnus.programme-metadata.v1",
  milestoneDescription: "cygnus.milestone-description.v1",
  evidence: "cygnus.evidence.v1",
  rejectionReason: "cygnus.rejection-reason.v1",
} as const;

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Canonical JSON: object keys sorted lexicographically at every level, no
 * insignificant whitespace. Two documents that are equal as data serialise to
 * identical bytes, which is what makes the hash reproducible across languages.
 */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",");
  return `{${body}}`;
}

function hashDocument(domain: string, document: JsonValue): Buffer {
  const preimage = new TextEncoder().encode(`${domain}\n${canonicalJson(document)}`);
  return Buffer.from(sha256(preimage));
}

export function hashProgrammeMetadata(metadata: JsonValue): Buffer {
  return hashDocument(DOMAINS.programmeMetadata, metadata);
}

export function hashMilestoneDescription(description: JsonValue): Buffer {
  return hashDocument(DOMAINS.milestoneDescription, description);
}

export function hashEvidence(evidence: JsonValue): Buffer {
  return hashDocument(DOMAINS.evidence, evidence);
}

export function hashRejectionReason(reason: JsonValue): Buffer {
  return hashDocument(DOMAINS.rejectionReason, reason);
}
