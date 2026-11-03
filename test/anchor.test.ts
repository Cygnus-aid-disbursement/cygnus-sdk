import { describe, expect, it } from "vitest";
import { NotImplementedError, StubAnchor } from "../src/anchor.js";

describe("StubAnchor", () => {
  const stub = new StubAnchor();

  it("throws NotImplementedError on quote", async () => {
    await expect(stub.quote()).rejects.toThrow(NotImplementedError);
    await expect(stub.quote()).rejects.toThrow("Anchor.quote is not implemented");
  });

  it("throws NotImplementedError on initiatePayout", async () => {
    await expect(stub.initiatePayout()).rejects.toThrow(NotImplementedError);
    await expect(stub.initiatePayout()).rejects.toThrow("Anchor.initiatePayout is not implemented");
  });

  it("throws NotImplementedError on pollStatus", async () => {
    await expect(stub.pollStatus()).rejects.toThrow(NotImplementedError);
    await expect(stub.pollStatus()).rejects.toThrow("Anchor.pollStatus is not implemented");
  });
});
