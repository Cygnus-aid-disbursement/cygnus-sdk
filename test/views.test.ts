import { describe, expect, it } from "vitest";
import { formatApproverConfig, normalizeMilestone, normalizeProgramme } from "../src/views.js";
import type { Milestone, MilestoneState, Programme } from "../src/generated/index.js";

describe("formatApproverConfig", () => {
  it("formats Single approver", () => {
    expect(formatApproverConfig({ tag: "Single", values: ["G_SPONSOR"] })).toBe(
      "Single(G_SPONSOR)",
    );
  });

  it("formats Panel approver", () => {
    expect(
      formatApproverConfig({
        tag: "Panel",
        values: [["G1", "G2", "G3"], 2],
      }),
    ).toBe("Panel(2 of 3)");
  });

  it("formats Oracle approver", () => {
    expect(formatApproverConfig({ tag: "Oracle", values: ["G_ORACLE"] })).toBe("Oracle(G_ORACLE)");
  });
});

describe("normalizeMilestone", () => {
  const hash = Buffer.alloc(32, 5);

  it("normalizes a pending milestone", () => {
    const m: Milestone = {
      amount: 500n,
      description_hash: hash,
      due_by: 1700000000n,
    };
    const view = normalizeMilestone(m, 0, undefined, 1600000000);
    expect(view.index).toBe(0);
    expect(view.amount).toBe(500n);
    expect(view.status).toBe("pending");
    expect(view.isOverdue).toBe(false);
    expect(view.descriptionHashHex).toBe(hash.toString("hex"));
  });

  it("flags overdue milestone when current time exceeds due date", () => {
    const m: Milestone = {
      amount: 500n,
      description_hash: hash,
      due_by: 1700000000n,
    };
    const view = normalizeMilestone(m, 1, undefined, 1800000000);
    expect(view.isOverdue).toBe(true);
  });

  it("normalizes a claimed milestone with evidence", () => {
    const m: Milestone = {
      amount: 1000n,
      description_hash: hash,
      due_by: 1700000000n,
    };
    const state: MilestoneState = {
      claimed_at: 1700000500n,
      claimed_late: true,
      evidence_hash: hash,
      reason_hash: undefined,
      status: { tag: "Claimed", values: undefined },
    };
    const view = normalizeMilestone(m, 0, state);
    expect(view.status).toBe("claimed");
    expect(view.claimedLate).toBe(true);
    expect(view.evidenceHashHex).toBe(hash.toString("hex"));
    expect(view.claimedAt).toBe(1700000500);
  });
});

describe("normalizeProgramme", () => {
  const hash = Buffer.alloc(32, 9);

  it("normalizes a full programme with calculations and percentages", () => {
    const prog: Programme = {
      id: 10n,
      sponsor: "G_SPONSOR",
      implementer: "G_IMPL",
      asset: "USDC",
      total: 10000n,
      funded: 8000n,
      released: 5000n,
      disbursed: 2000n,
      created_at: 1700000000n,
      end_by: 1800000000n,
      batch_count: 2,
      status: { tag: "Active", values: undefined },
      approver: { tag: "Single", values: ["G_APPROVER"] },
      metadata_hash: hash,
      milestones: [
        {
          amount: 5000n,
          description_hash: hash,
          due_by: 1750000000n,
        },
      ],
      milestone_states: [
        {
          claimed_at: 1740000000n,
          claimed_late: false,
          evidence_hash: hash,
          reason_hash: undefined,
          status: { tag: "Approved", values: undefined },
        },
      ],
    };

    const view = normalizeProgramme(prog, 1750000000);
    expect(view.id).toBe(10n);
    expect(view.sponsor).toBe("G_SPONSOR");
    expect(view.total).toBe(10000n);
    expect(view.funded).toBe(8000n);
    expect(view.remainingToFund).toBe(2000n);
    expect(view.remainingSpendable).toBe(3000n); // released (5000) - disbursed (2000)
    expect(view.fundedPercentage).toBe(80);
    expect(view.releasedPercentage).toBe(50);
    expect(view.disbursedPercentage).toBe(20);
    expect(view.isFullyFunded).toBe(false);
    expect(view.isFullyDisbursed).toBe(false);
    expect(view.isEnded).toBe(false);
    expect(view.approverSummary).toBe("Single(G_APPROVER)");
    expect(view.milestones.length).toBe(1);
    expect(view.milestones[0].status).toBe("approved");
  });

  it("flags isFullyFunded and isFullyDisbursed when totals match", () => {
    const prog: Programme = {
      id: 20n,
      sponsor: "S",
      implementer: "I",
      asset: "USDC",
      total: 1000n,
      funded: 1000n,
      released: 1000n,
      disbursed: 1000n,
      created_at: 100n,
      end_by: 200n,
      batch_count: 5,
      status: { tag: "Active", values: undefined },
      approver: { tag: "Single", values: ["A"] },
      metadata_hash: hash,
      milestones: [],
      milestone_states: [],
    };
    const view = normalizeProgramme(prog);
    expect(view.isFullyFunded).toBe(true);
    expect(view.isFullyDisbursed).toBe(true);
  });

  it("handles zero denominator safely", () => {
    const prog: Programme = {
      id: 1n,
      sponsor: "S",
      implementer: "I",
      asset: "A",
      total: 0n,
      funded: 0n,
      released: 0n,
      disbursed: 0n,
      created_at: 0n,
      end_by: 0n,
      batch_count: 0,
      status: { tag: "Closed", values: undefined },
      approver: { tag: "Oracle", values: ["O"] },
      metadata_hash: hash,
      milestones: [],
      milestone_states: [],
    };
    const view = normalizeProgramme(prog);
    expect(view.fundedPercentage).toBe(0);
    expect(view.status).toBe("closed");
  });
});
