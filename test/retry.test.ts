import { describe, expect, it, vi } from "vitest";
import { isRetryableError, withRetry } from "../src/retry.js";

describe("isRetryableError", () => {
  it("recognizes HTTP 429 status and rate limit messages", () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError(new Error("Rate limit exceeded"))).toBe(true);
    expect(isRetryableError("Error: 429 Too Many Requests")).toBe(true);
  });

  it("recognizes transient 5xx server errors", () => {
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
    expect(isRetryableError(new Error("504 Gateway Timeout"))).toBe(true);
  });

  it("recognizes network connection issues", () => {
    expect(isRetryableError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableError(new Error("read ECONNRESET"))).toBe(true);
    expect(isRetryableError(new Error("connect ETIMEDOUT"))).toBe(true);
  });

  it("rejects non-retryable business logic errors", () => {
    expect(isRetryableError(new Error("Invalid parameters"))).toBe(false);
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe("withRetry", () => {
  it("resolves immediately when fn succeeds without error", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValueOnce("recovered");

    const delays: number[] = [];
    const onRetry = vi.fn((_err, _attempt, delay) => delays.push(delay));

    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      sleep: () => Promise.resolve(),
      onRetry,
    });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(delays.length).toBe(1);
  });

  it("aborts immediately when error is not retryable", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Contract verification failed"));
    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow("Contract verification failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting maxRetries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));
    await expect(
      withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 1,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toThrow("503 Service Unavailable");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
