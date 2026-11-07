export interface RetryOptions {
  /** Maximum number of retry attempts. Defaults to 3. */
  maxRetries?: number;
  /** Initial delay in milliseconds before the first retry. Defaults to 500ms. */
  initialDelayMs?: number;
  /** Maximum delay cap in milliseconds. Defaults to 10,000ms. */
  maxDelayMs?: number;
  /** Exponential backoff multiplier. Defaults to 2. */
  backoffFactor?: number;
  /** Custom predicate deciding if an error can be retried. Defaults to isRetryableError. */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback invoked on each retry attempt. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Custom sleep implementation, for fast testing without real wall-clock delays. */
  sleep?: (ms: number) => Promise<void>;
  /** Optional AbortSignal to cancel further retry attempts immediately. */
  signal?: AbortSignal;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;
const DEFAULT_BACKOFF_FACTOR = 2;

/**
 * Predicate to identify transient errors that should be retried:
 * - Rate limiting (HTTP 429 / "Too Many Requests")
 * - Transient server failures (HTTP 500, 502, 503, 504)
 * - Network disruptions (fetch failed, ECONNRESET, ETIMEDOUT, ENOTFOUND)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Check HTTP response status codes if present on error object
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const status = Number(obj.status ?? obj.statusCode ?? obj.code);
    if (status === 429 || (status >= 500 && status <= 504)) {
      return true;
    }
  }

  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  const retryableKeywords = [
    "429",
    "too many requests",
    "rate limit",
    "502 bad gateway",
    "503 service unavailable",
    "504 gateway timeout",
    "econnreset",
    "etimedout",
    "enotfound",
    "fetch failed",
    "network error",
    "timeout",
  ];

  return retryableKeywords.some((keyword) => msg.includes(keyword));
}

/**
 * Execute an asynchronous function with exponential backoff and full jitter.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelay = opts.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelay = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const backoffFactor = opts.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const isRetryable = opts.isRetryable ?? isRetryableError;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let attempt = 0;
  for (;;) {
    if (opts.signal?.aborted) {
      throw opts.signal.reason ?? new Error("The operation was aborted");
    }

    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isRetryable(err) || opts.signal?.aborted) {
        throw err;
      }

      // Calculate exponential backoff with full jitter
      const exponentialDelay = Math.min(
        maxDelay,
        initialDelay * Math.pow(backoffFactor, attempt - 1),
      );
      // Full jitter: uniformly random delay between 0 and exponentialDelay
      const jitteredDelay = Math.floor(Math.random() * exponentialDelay);

      if (opts.onRetry) {
        opts.onRetry(err, attempt, jitteredDelay);
      }

      await sleep(jitteredDelay);
    }
  }
}
