import { describe, expect, it } from "vitest";
import { MemoryAnchor } from "../src/anchor.js";

describe("MemoryAnchor", () => {
  it("generates quotes with exchange rate and expiration", async () => {
    const anchor = new MemoryAnchor({ rate: 1.5, quoteTtlSeconds: 60 });
    // 50_000_000 stroops = 5 units -> 5 * 1.5 = 7.50
    const quote = await anchor.quote(50_000_000n, "EUR");

    expect(quote.id).toMatch(/^quote-1-/);
    expect(quote.sourceAmount).toBe(50_000_000n);
    expect(quote.destinationAmount).toBe("7.50");
    expect(quote.destinationAsset).toBe("EUR");
    expect(new Date(quote.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(anchor.quoteCount).toBe(1);
  });

  it("throws on non-positive source amount", async () => {
    const anchor = new MemoryAnchor();
    await expect(anchor.quote(0n, "USD")).rejects.toThrow(RangeError);
    await expect(anchor.quote(-100n, "USD")).rejects.toThrow(RangeError);
  });

  it("initiates payout and transitions from processing to completed", async () => {
    const anchor = new MemoryAnchor({ pollsToComplete: 2 });
    const quote = await anchor.quote(100_000_000n, "USD");
    const recipientRef = Buffer.alloc(32, 4);

    const initial = await anchor.initiatePayout({
      quoteId: quote.id,
      recipientRef,
      sourceAmount: 100_000_000n,
    });

    expect(initial.state).toBe("processing");
    expect(initial.payoutId).toMatch(/^payout-1-/);

    // Poll 1: still processing
    const poll1 = await anchor.pollStatus(initial.payoutId);
    expect(poll1.state).toBe("processing");

    // Poll 2: reached pollsToComplete (2) -> completed
    const poll2 = await anchor.pollStatus(initial.payoutId);
    expect(poll2.state).toBe("completed");
    expect(poll2.detail).toContain("delivered");
  });

  it("rejects payout when amount does not match quote", async () => {
    const anchor = new MemoryAnchor();
    const quote = await anchor.quote(100n, "USD");
    await expect(
      anchor.initiatePayout({
        quoteId: quote.id,
        recipientRef: Buffer.alloc(32, 1),
        sourceAmount: 99n,
      }),
    ).rejects.toThrow("Amount mismatch");
  });

  it("rejects payout when quote has expired", async () => {
    const anchor = new MemoryAnchor({ quoteTtlSeconds: -10 }); // already expired
    const quote = await anchor.quote(100n, "USD");
    await expect(
      anchor.initiatePayout({
        quoteId: quote.id,
        recipientRef: Buffer.alloc(32, 1),
        sourceAmount: 100n,
      }),
    ).rejects.toThrow("has expired");
  });

  it("rejects payout when recipientRef is not 32 bytes", async () => {
    const anchor = new MemoryAnchor();
    const quote = await anchor.quote(100n, "USD");
    await expect(
      anchor.initiatePayout({
        quoteId: quote.id,
        recipientRef: Buffer.alloc(16),
        sourceAmount: 100n,
      }),
    ).rejects.toThrow("32-byte salted buffer");
  });

  it("throws when polling non-existent payout", async () => {
    const anchor = new MemoryAnchor();
    await expect(anchor.pollStatus("non-existent")).rejects.toThrow("Payout not found");
  });

  it("simulates delivery failure when failureRate is set", async () => {
    const anchor = new MemoryAnchor({ failureRate: 1.0 }); // 100% failure
    const quote = await anchor.quote(10n, "USD");
    const payout = await anchor.initiatePayout({
      quoteId: quote.id,
      recipientRef: Buffer.alloc(32, 1),
      sourceAmount: 10n,
    });
    expect(payout.state).toBe("failed");
    expect(payout.detail).toContain("Simulated payout rail delivery failure");
  });

  it("honors artificial latency simulation", async () => {
    const start = Date.now();
    const anchor = new MemoryAnchor({ latencyMs: 25 });
    await anchor.quote(10n, "USD");
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("clears quotes and payouts when reset() is called", async () => {
    const anchor = new MemoryAnchor();
    const quote = await anchor.quote(100n, "USD");
    await anchor.initiatePayout({
      quoteId: quote.id,
      recipientRef: Buffer.alloc(32, 1),
      sourceAmount: 100n,
    });
    expect(anchor.quoteCount).toBe(1);
    expect(anchor.payoutCount).toBe(1);

    anchor.reset();
    expect(anchor.quoteCount).toBe(0);
    expect(anchor.payoutCount).toBe(0);
  });
});
