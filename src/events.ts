import type { Cygnus, CygnusEvent } from "./client.js";

export interface EventCursor {
  latestLedger: number;
  eventsProcessed: number;
}

export interface EventSubscriptionOptions {
  /** The ledger sequence to start querying events from. */
  startLedger: number;
  /** Polling interval in milliseconds. Defaults to 2,000ms. */
  pollIntervalMs?: number;
  /** Callback invoked on each decoded Cygnus event. */
  onEvent: (event: CygnusEvent) => void;
  /** Optional callback invoked on polling or decoding errors. */
  onError?: (error: unknown) => void;
  /** Optional callback called with cursor state after processing each batch. */
  onCursorUpdate?: (cursor: EventCursor) => void;
}

export interface EventSubscription {
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Start a polling subscription that streams decoded contract events as they settle on-chain.
 */
export function subscribeToEvents(
  client: Cygnus,
  options: EventSubscriptionOptions,
): EventSubscription {
  const pollInterval = options.pollIntervalMs ?? 2000;
  let active = true;
  let currentLedger = options.startLedger;
  let count = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function poll() {
    if (!active) return;
    try {
      const events = await client.events(currentLedger);
      if (events.length > 0) {
        for (const evt of events) {
          if (!active) break;
          options.onEvent(evt);
          count++;
        }
        // Advance currentLedger past the current batch
        currentLedger++;
        if (options.onCursorUpdate) {
          options.onCursorUpdate({ latestLedger: currentLedger, eventsProcessed: count });
        }
      }
    } catch (err) {
      if (options.onError) {
        options.onError(err);
      }
    } finally {
      if (active) {
        timer = setTimeout(poll, pollInterval);
      }
    }
  }

  // Initial trigger
  poll();

  return {
    stop() {
      active = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    isRunning() {
      return active;
    },
  };
}
