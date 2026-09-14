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
  async quote(): Promise<Quote> {
    throw new NotImplementedError("Anchor.quote");
  }
  async initiatePayout(): Promise<PayoutStatus> {
    throw new NotImplementedError("Anchor.initiatePayout");
  }
  async pollStatus(): Promise<PayoutStatus> {
    throw new NotImplementedError("Anchor.pollStatus");
  }
}
