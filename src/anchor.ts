// The anchor interface covers the last mile: turning a Stellar payout into local
// currency or mobile money. Cygnus ships the interface and one stub, not a full
// SEP-31 or SEP-24 flow; a live integration is contributor work (see ISSUES.md).
//
// Keeping this an interface means a programme can run entirely on direct USDC
// where no anchor exists, and a new rail can be added without touching the rest
// of the SDK.

export interface Quote {
  id: string;
  // Amount sent on Stellar, in stroops of the source asset.
  sourceAmount: bigint;
  // What the beneficiary receives, in the destination unit (for example minor
  // units of a fiat currency), as a decimal string to avoid rounding surprises.
  destinationAmount: string;
  destinationAsset: string;
  expiresAt: string;
}

export interface PayoutRequest {
  quoteId: string;
  // A salted recipient reference, never a raw identifier. The destination
  // account details are handled by the anchor out of band, not passed here.
  recipientRef: Buffer;
  sourceAmount: bigint;
}

export type PayoutState = "pending" | "processing" | "completed" | "failed";

export interface PayoutStatus {
  payoutId: string;
  state: PayoutState;
  detail?: string;
}

export interface Anchor {
  quote(sourceAmount: bigint, destinationAsset: string): Promise<Quote>;
  initiatePayout(request: PayoutRequest): Promise<PayoutStatus>;
  pollStatus(payoutId: string): Promise<PayoutStatus>;
}

export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(
      `${feature} is not implemented. The anchor interface ships as a stub; ` +
        `add a real implementation against a Testnet anchor. See docs and ISSUES.md.`,
    );
    this.name = "NotImplementedError";
  }
}

/**
 * A stub anchor that throws a helpful error for every call. Use it as the shape
 * to implement against, and to prove the rest of a flow works before a real
 * anchor exists.
 */
export class StubAnchor implements Anchor {
  async quote(_sourceAmount?: bigint, _destinationAsset?: string): Promise<Quote> {
    throw new NotImplementedError("Anchor.quote");
  }
  async initiatePayout(_request?: PayoutRequest): Promise<PayoutStatus> {
    throw new NotImplementedError("Anchor.initiatePayout");
  }
  async pollStatus(_payoutId?: string): Promise<PayoutStatus> {
    throw new NotImplementedError("Anchor.pollStatus");
  }
}

export interface MemoryAnchorOptions {
  /** Exchange rate multiplier from 1 stroop (1e-7 unit) to destination minor unit. Defaults to 1 (1:1). */
  rate?: number;
  /** Quote validity window in seconds. Defaults to 300 seconds (5 minutes). */
  quoteTtlSeconds?: number;
  /** Automatically transition payouts to "completed" after N poll cycles. Defaults to 1. */
  pollsToComplete?: number;
}

/**
 * An in-memory reference implementation of Anchor for testing and local simulation.
 * Manages quotes, validates expirations and amounts, and advances payout state machine.
 */
export class MemoryAnchor implements Anchor {
  private readonly quotes = new Map<string, Quote>();
  private readonly payouts = new Map<string, { status: PayoutStatus; polls: number }>();
  private readonly rate: number;
  private readonly quoteTtlSeconds: number;
  private readonly pollsToComplete: number;
  private quoteCounter = 0;
  private payoutCounter = 0;

  constructor(options: MemoryAnchorOptions = {}) {
    this.rate = options.rate ?? 1;
    this.quoteTtlSeconds = options.quoteTtlSeconds ?? 300;
    this.pollsToComplete = options.pollsToComplete ?? 1;
  }

  async quote(sourceAmount: bigint, destinationAsset: string): Promise<Quote> {
    if (sourceAmount <= 0n) {
      throw new RangeError("sourceAmount must be strictly positive");
    }
    if (!destinationAsset) {
      throw new Error("destinationAsset must be specified");
    }

    this.quoteCounter++;
    const id = `quote-${this.quoteCounter}-${Date.now()}`;
    const destinationUnits = (Number(sourceAmount) / 1e7) * this.rate;
    const destinationAmount = destinationUnits.toFixed(2);
    const expiresAt = new Date(Date.now() + this.quoteTtlSeconds * 1000).toISOString();

    const quote: Quote = {
      id,
      sourceAmount,
      destinationAmount,
      destinationAsset,
      expiresAt,
    };

    this.quotes.set(id, quote);
    return quote;
  }

  async initiatePayout(request: PayoutRequest): Promise<PayoutStatus> {
    const quote = this.quotes.get(request.quoteId);
    if (!quote) {
      throw new Error(`Quote not found: ${request.quoteId}`);
    }

    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      throw new Error(`Quote ${request.quoteId} has expired`);
    }

    if (request.sourceAmount !== quote.sourceAmount) {
      throw new Error(
        `Amount mismatch: quote requires ${quote.sourceAmount}, got ${request.sourceAmount}`,
      );
    }

    if (!request.recipientRef || request.recipientRef.length !== 32) {
      throw new Error("recipientRef must be a 32-byte salted buffer");
    }

    this.payoutCounter++;
    const payoutId = `payout-${this.payoutCounter}-${Date.now()}`;
    const status: PayoutStatus = {
      payoutId,
      state: "processing",
      detail: `Payout initiated for ${quote.destinationAmount} ${quote.destinationAsset}`,
    };

    this.payouts.set(payoutId, { status, polls: 0 });
    return status;
  }

  async pollStatus(payoutId: string): Promise<PayoutStatus> {
    const entry = this.payouts.get(payoutId);
    if (!entry) {
      throw new Error(`Payout not found: ${payoutId}`);
    }

    entry.polls++;
    if (entry.polls >= this.pollsToComplete && entry.status.state === "processing") {
      entry.status = {
        payoutId,
        state: "completed",
        detail: "Funds delivered to beneficiary rail",
      };
    }

    return entry.status;
  }

  get quoteCount(): number {
    return this.quotes.size;
  }

  get payoutCount(): number {
    return this.payouts.size;
  }
}
