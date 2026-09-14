import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  hashEvidence,
  hashMilestoneDescription,
  hashProgrammeMetadata,
  hashRejectionReason,
} from "../src/hashing.js";

describe("canonicalJson", () => {
  it("sorts object keys and ignores insertion order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe(canonicalJson({ b: 1, a: 2 }));
  });

  it("sorts nested keys", () => {
    expect(canonicalJson({ z: { y: 1, x: 2 } })).toBe('{"z":{"x":2,"y":1}}');
  });

  it("preserves array order", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("document hashes", () => {
  const doc = { title: "Water points", region: "Sample" };

  it("are 32 bytes and stable across key order", () => {
    const a = hashProgrammeMetadata({ title: "Water points", region: "Sample" });
    const b = hashProgrammeMetadata({ region: "Sample", title: "Water points" });
    expect(a.length).toBe(32);
    expect(a.equals(b)).toBe(true);
  });

  it("differ by domain for the same document", () => {
    const asMetadata = hashProgrammeMetadata(doc);
    const asDescription = hashMilestoneDescription(doc);
    const asEvidence = hashEvidence(doc);
    const asReason = hashRejectionReason(doc);
    const all = [asMetadata, asDescription, asEvidence, asReason].map((h) => h.toString("hex"));
    expect(new Set(all).size).toBe(4);
  });
});
