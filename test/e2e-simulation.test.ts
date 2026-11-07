import { describe, expect, it } from "vitest";
import { MemoryAnchor } from "../src/anchor.js";
import { buildBatch } from "../src/batch.js";
import { createReceipt, verifyReceipt } from "../src/receipt.js";
import { normalizeProgramme } from "../src/views.js";
import type { Programme } from "../src/generated/index.js";

describe("End-to-End Disbursement and Payout Simulation", () => {
  it("executes complete flow from batch creation to anchor last-mile payout", async () => {
    // 1. Set up programme parameters
    const programmeId = 101n;
    const salt = new TextEncoder().encode("e2e-humanitarian-programme-salt");
    const recipients = [
      { reference: "beneficiary-alpha", amount: 50_000_000n }, // 5 USDC
      { reference: "beneficiary-bravo", amount: 75_000_000n }, // 7.5 USDC
      { reference: "beneficiary-charlie", amount: 100_000_000n }, // 10 USDC
    ];

    // 2. Build Merkle disbursement batch
    const batch = buildBatch(recipients, salt);
    expect(batch.count).toBe(3);
    expect(batch.total).toBe(225_000_000n);
    expect(batch.leaves.length).toBe(3);

    // 3. Generate and verify beneficiary receipts offline
    const receipts = recipients.map((r, i) =>
      createReceipt({
        programmeId,
        batchIndex: 0,
        entryIndex: i,
        batch,
        amount: r.amount,
      }),
    );

    for (const receipt of receipts) {
      const isValid = verifyReceipt(receipt, batch.root.toString("hex"));
      expect(isValid).toBe(true);
    }

    // 4. Anchor last-mile payout rail simulation
    const anchor = new MemoryAnchor({ rate: 1.0, pollsToComplete: 1 });

    for (const receipt of receipts) {
      // Beneficiary or implementer requests quote
      const quote = await anchor.quote(BigInt(receipt.amount), "USDC");
      expect(quote.sourceAmount).toBe(BigInt(receipt.amount));

      // Initiate payout using salted recipient reference (never raw ID!)
      const payout = await anchor.initiatePayout({
        quoteId: quote.id,
        recipientRef: Buffer.from(receipt.recipientRefHex, "hex"),
        sourceAmount: BigInt(receipt.amount),
      });
      expect(payout.state).toBe("processing");

      // Poll until completed
      const finalStatus = await anchor.pollStatus(payout.payoutId);
      expect(finalStatus.state).toBe("completed");
    }

    expect(anchor.quoteCount).toBe(3);
    expect(anchor.payoutCount).toBe(3);

    // 5. Verify programme view normalizer reflects updated disbursement state
    const prog: Programme = {
      id: programmeId,
      sponsor: "GB_SPONSOR_KEY",
      implementer: "GB_IMPL_KEY",
      asset: "USDC",
      total: 500_000_000n,
      funded: 500_000_000n,
      released: 300_000_000n,
      disbursed: batch.total,
      created_at: 1700000000n,
      end_by: 1800000000n,
      batch_count: 1,
      status: { tag: "Active", values: undefined },
      approver: { tag: "Single", values: ["GB_APPROVER_KEY"] },
      metadata_hash: Buffer.alloc(32, 1),
      milestones: [
        {
          amount: 300_000_000n,
          description_hash: Buffer.alloc(32, 2),
          due_by: 1750000000n,
        },
      ],
      milestone_states: [
        {
          claimed_at: 1740000000n,
          claimed_late: false,
          evidence_hash: Buffer.alloc(32, 3),
          reason_hash: undefined,
          status: { tag: "Approved", values: undefined },
        },
      ],
    };

    const view = normalizeProgramme(prog);
    expect(view.disbursed).toBe(225_000_000n);
    expect(view.remainingSpendable).toBe(75_000_000n);
    expect(view.fundedPercentage).toBe(100);
    expect(view.disbursedPercentage).toBe(45);
  });
});
