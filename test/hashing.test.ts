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

  it("omits undefined properties in objects and turns undefined to null in arrays", () => {
    expect(canonicalJson({ b: 1, a: undefined as unknown as any })).toBe('{"b":1}');
    expect(canonicalJson([1, undefined as unknown as any, 3])).toBe("[1,null,3]");
  });

  it("handles primitives, empty containers, and deeply nested values", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(false)).toBe("false");
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson("hello")).toBe('"hello"');
    expect(canonicalJson({})).toBe("{}");
    expect(canonicalJson([])).toBe("[]");
    expect(canonicalJson({ deep: { nested: [{}, { k: "v" }] } })).toBe(
      '{"deep":{"nested":[{},{"k":"v"}]}}',
    );
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
