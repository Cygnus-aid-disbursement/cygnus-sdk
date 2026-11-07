import { describe, expect, it } from "vitest";
import { decodeEvent } from "../src/client.js";

describe("decodeEvent", () => {
  const programmeId = 101n;
  const h32 = Buffer.alloc(32, 7);

  it("decodes ProgrammeCreated", () => {
    const event = decodeEvent(["ProgrammeCreated", programmeId], {
      sponsor: "GB_SPONSOR",
      implementer: "GB_IMPL",
      total: 5000n,
    });
    expect(event).toEqual({
      type: "ProgrammeCreated",
      programmeId: 101n,
      sponsor: "GB_SPONSOR",
      implementer: "GB_IMPL",
      total: 5000n,
    });
  });

  it("decodes ProgrammeFunded", () => {
    const event = decodeEvent(["ProgrammeFunded", programmeId], {
      amount: 1500n,
    });
    expect(event).toEqual({
      type: "ProgrammeFunded",
      programmeId: 101n,
      amount: 1500n,
    });
  });

  it("decodes MilestoneClaimed", () => {
    const event = decodeEvent(["MilestoneClaimed", programmeId], {
      milestone_index: 0,
      evidence_hash: h32,
      claimed_late: true,
    });
    expect(event).toEqual({
      type: "MilestoneClaimed",
      programmeId: 101n,
      milestoneIndex: 0,
      evidenceHash: h32,
      claimedLate: true,
    });
  });

  it("decodes MilestoneApproved", () => {
    const event = decodeEvent(["MilestoneApproved", programmeId], {
      milestone_index: 1,
    });
    expect(event).toEqual({
      type: "MilestoneApproved",
      programmeId: 101n,
      milestoneIndex: 1,
    });
  });

  it("decodes MilestoneRejected", () => {
    const event = decodeEvent(["MilestoneRejected", programmeId], {
      milestone_index: 2,
      reason_hash: h32,
    });
    expect(event).toEqual({
      type: "MilestoneRejected",
      programmeId: 101n,
      milestoneIndex: 2,
      reasonHash: h32,
    });
  });

  it("decodes BatchDisbursed", () => {
    const event = decodeEvent(["BatchDisbursed", programmeId], {
      batch_index: 0,
      root: h32,
      total: 2500n,
      count: 50,
    });
    expect(event).toEqual({
      type: "BatchDisbursed",
      programmeId: 101n,
      batchIndex: 0,
      root: h32,
      total: 2500n,
      count: 50,
    });
  });

  it("decodes ProgrammeRefunded", () => {
    const event = decodeEvent(["ProgrammeRefunded", programmeId], {
      amount: 300n,
    });
    expect(event).toEqual({
      type: "ProgrammeRefunded",
      programmeId: 101n,
      amount: 300n,
    });
  });

  it("returns undefined for invalid inputs or unknown event names", () => {
    expect(decodeEvent([], {})).toBeUndefined();
    expect(decodeEvent(["OnlyOneTopic"], {})).toBeUndefined();
    expect(decodeEvent(null as unknown as any, {})).toBeUndefined();
    expect(decodeEvent(["ProgrammeCreated", 1n], null)).toBeUndefined();
    expect(decodeEvent(["UnknownEvent", 1n], {})).toBeUndefined();
  });

  it("returns undefined when required event fields are missing", () => {
    expect(decodeEvent(["ProgrammeCreated", 1n], { sponsor: "GB" })).toBeUndefined();
    expect(decodeEvent(["MilestoneClaimed", 1n], { milestone_index: 0 })).toBeUndefined();
    expect(decodeEvent(["MilestoneRejected", 1n], { milestone_index: 0 })).toBeUndefined();
    expect(decodeEvent(["BatchDisbursed", 1n], { batch_index: 0 })).toBeUndefined();
  });
});
