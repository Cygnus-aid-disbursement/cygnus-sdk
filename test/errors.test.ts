import { describe, expect, it } from "vitest";
import {
  ContractErrorCode,
  CygnusError,
  CygnusContractError,
  ProgrammeNotFoundError,
  AlreadyClosedError,
  MilestoneIndexOutOfRangeError,
  MilestoneNotClaimableError,
  MilestoneNotClaimedError,
  MilestoneAlreadyResolvedError,
  InsufficientFundingError,
  InsufficientReleasedError,
  NotEndedError,
  InvalidAmountError,
  InvalidBatchError,
  ApproverKindUnimplementedError,
  NothingToRefundError,
  BatchIndexOutOfRangeError,
  createContractError,
  parseContractError,
  unwrapContractResult,
} from "../src/errors.js";

describe("Cygnus Error hierarchy", () => {
  it("base CygnusError is an instance of Error", () => {
    const err = new CygnusError("base error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CygnusError);
    expect(err.name).toBe("CygnusError");
    expect(err.message).toBe("base error");
  });

  it("subclasses instantiate with proper code and inheritance", () => {
    const list = [
      { Cls: ProgrammeNotFoundError, code: 1, name: "ProgrammeNotFound" },
      { Cls: AlreadyClosedError, code: 2, name: "AlreadyClosed" },
      { Cls: MilestoneIndexOutOfRangeError, code: 3, name: "MilestoneIndexOutOfRange" },
      { Cls: MilestoneNotClaimableError, code: 4, name: "MilestoneNotClaimable" },
      { Cls: MilestoneNotClaimedError, code: 5, name: "MilestoneNotClaimed" },
      { Cls: MilestoneAlreadyResolvedError, code: 6, name: "MilestoneAlreadyResolved" },
      { Cls: InsufficientFundingError, code: 7, name: "InsufficientFunding" },
      { Cls: InsufficientReleasedError, code: 8, name: "InsufficientReleased" },
      { Cls: NotEndedError, code: 9, name: "NotEnded" },
      { Cls: InvalidAmountError, code: 10, name: "InvalidAmount" },
      { Cls: InvalidBatchError, code: 11, name: "InvalidBatch" },
      { Cls: ApproverKindUnimplementedError, code: 12, name: "ApproverKindUnimplemented" },
      { Cls: NothingToRefundError, code: 13, name: "NothingToRefund" },
      { Cls: BatchIndexOutOfRangeError, code: 14, name: "BatchIndexOutOfRange" },
    ];

    for (const item of list) {
      const err = new item.Cls();
      expect(err).toBeInstanceOf(CygnusError);
      expect(err).toBeInstanceOf(CygnusContractError);
      expect(err).toBeInstanceOf(item.Cls);
      expect(err.code).toBe(item.code);
      expect(err.codeName).toBe(item.name);
      expect(err.message).toContain(`Contract error ${item.code} (${item.name})`);
    }
  });

  it("createContractError creates the exact subclass", () => {
    const err = createContractError(ContractErrorCode.ProgrammeNotFound);
    expect(err).toBeInstanceOf(ProgrammeNotFoundError);
    expect(err.code).toBe(1);

    const unknown = createContractError(999, "Special details");
    expect(unknown).toBeInstanceOf(CygnusContractError);
    expect(unknown.code).toBe(999);
    expect(unknown.codeName).toBe("UnknownContractError");
  });
});

describe("parseContractError", () => {
  it("parses numeric codes", () => {
    const err = parseContractError(1);
    expect(err).toBeInstanceOf(ProgrammeNotFoundError);
  });

  it("parses Error(Contract, #N) host error format", () => {
    const err = parseContractError("HostError: Error(Contract, #7)");
    expect(err).toBeInstanceOf(InsufficientFundingError);
    expect(err?.code).toBe(7);
  });

  it("parses Error instance containing contract error message", () => {
    const err = parseContractError(new Error("Transaction failed with Error(Contract, #13)"));
    expect(err).toBeInstanceOf(NothingToRefundError);
  });

  it("parses substring name match", () => {
    const err = parseContractError("Simulation failed: MilestoneIndexOutOfRange occurred");
    expect(err).toBeInstanceOf(MilestoneIndexOutOfRangeError);
  });

  it("parses object with numeric code", () => {
    const err = parseContractError({ code: 8, message: "Released stroops exhausted" });
    expect(err).toBeInstanceOf(InsufficientReleasedError);
  });

  it("returns existing CygnusContractError instance as-is", () => {
    const orig = new AlreadyClosedError();
    expect(parseContractError(orig)).toBe(orig);
  });

  it("returns undefined for unrecognized formats or empty values", () => {
    expect(parseContractError(null)).toBeUndefined();
    expect(parseContractError(undefined)).toBeUndefined();
    expect(parseContractError("Something unrelated went wrong")).toBeUndefined();
    expect(parseContractError(12345)).toBeUndefined();
  });

  describe("unwrapContractResult", () => {
    it("returns value if result is Ok", () => {
      const okResult = {
        isOk: () => true,
        unwrap: () => 42n,
      };
      expect(unwrapContractResult(okResult)).toBe(42n);
    });

    it("throws typed CygnusContractError if result is Err with recognized error", () => {
      const errResult = {
        isOk: () => false,
        unwrap: () => {
          throw new Error("Should not be called");
        },
        unwrapErr: () => "HostError: Error(Contract, #1)",
      };
      expect(() => unwrapContractResult(errResult)).toThrow(ProgrammeNotFoundError);
    });

    it("falls back to unwrap() if unwrapErr is unrecognized", () => {
      const genericErrResult = {
        isOk: () => false,
        unwrap: () => {
          throw new Error("Generic failure");
        },
        unwrapErr: () => "unrecognized",
      };
      expect(() => unwrapContractResult(genericErrResult)).toThrow("Generic failure");
    });
  });
});
