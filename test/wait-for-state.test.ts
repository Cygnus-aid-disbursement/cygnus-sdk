import { describe, expect, it, vi } from "vitest";
import { Cygnus } from "../src/client.js";
import type { Programme } from "../src/generated/index.js";

function mockProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    id: 1n,
    sponsor: "SPONSOR",
    implementer: "IMPLEMENTER",
    asset: "USDC",
    total: 1000n,
    funded: 500n,
    released: 200n,
    disbursed: 100n,
    created_at: 1000n,
    end_by: 2000n,
    batch_count: 1,
    status: { tag: "Active", values: undefined },
    approver: { tag: "Single", values: ["APPROVER"] },
    metadata_hash: Buffer.alloc(32, 1),
    milestones: [],
    milestone_states: [],
    ...overrides,
  };
}

describe("waitForState", () => {
  it("resolves immediately if predicate matches on first poll", async () => {
    const client = new Cygnus();
    const prog = mockProgramme({ funded: 1000n });
    vi.spyOn(client, "getProgramme").mockResolvedValue(prog);

    const result = await client.waitForState(1n, (p) => p.funded === 1000n, {
      timeoutMs: 1000,
      intervalMs: 10,
    });
    expect(result).toBe(prog);
    expect(client.getProgramme).toHaveBeenCalledTimes(1);
  });

  it("polls multiple times until predicate holds", async () => {
    const client = new Cygnus();
    const prog1 = mockProgramme({ funded: 500n });
    const prog2 = mockProgramme({ funded: 1000n });
    const spy = vi
      .spyOn(client, "getProgramme")
      .mockResolvedValueOnce(prog1)
      .mockResolvedValueOnce(prog2);

    const result = await client.waitForState(1n, (p) => p.funded === 1000n, {
      timeoutMs: 1000,
      intervalMs: 10,
    });
    expect(result).toBe(prog2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("throws when timeout is reached", async () => {
    const client = new Cygnus();
    vi.spyOn(client, "getProgramme").mockResolvedValue(mockProgramme({ funded: 100n }));

    await expect(
      client.waitForState(1n, (p) => p.funded === 9999n, {
        timeoutMs: 50,
        intervalMs: 10,
      }),
    ).rejects.toThrow("waitForState timed out for programme 1");
  });

  it("continues polling if getProgramme returns undefined until timeout", async () => {
    const client = new Cygnus();
    vi.spyOn(client, "getProgramme").mockResolvedValue(undefined);

    await expect(
      client.waitForState(42n, (p) => p.funded > 0n, {
        timeoutMs: 40,
        intervalMs: 10,
      }),
    ).rejects.toThrow("waitForState timed out for programme 42");
  });
});
