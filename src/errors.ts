export const ContractErrorCode = {
  ProgrammeNotFound: 1,
  AlreadyClosed: 2,
  MilestoneIndexOutOfRange: 3,
  MilestoneNotClaimable: 4,
  MilestoneNotClaimed: 5,
  MilestoneAlreadyResolved: 6,
  InsufficientFunding: 7,
  InsufficientReleased: 8,
  NotEnded: 9,
  InvalidAmount: 10,
  InvalidBatch: 11,
  ApproverKindUnimplemented: 12,
  NothingToRefund: 13,
  BatchIndexOutOfRange: 14,
} as const;

export type ContractErrorCode = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

export const CONTRACT_ERROR_NAMES: Record<number, string> = {
  1: "ProgrammeNotFound",
  2: "AlreadyClosed",
  3: "MilestoneIndexOutOfRange",
  4: "MilestoneNotClaimable",
  5: "MilestoneNotClaimed",
  6: "MilestoneAlreadyResolved",
  7: "InsufficientFunding",
  8: "InsufficientReleased",
  9: "NotEnded",
  10: "InvalidAmount",
  11: "InvalidBatch",
  12: "ApproverKindUnimplemented",
  13: "NothingToRefund",
  14: "BatchIndexOutOfRange",
};

/** Base class for all Cygnus SDK errors. */
export class CygnusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CygnusError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Error thrown when a Soroban contract call returns an application error code. */
export class CygnusContractError extends CygnusError {
  readonly code: number;
  readonly codeName: string;

  constructor(code: number, codeName: string, detail?: string) {
    const msg = detail
      ? `Contract error ${code} (${codeName}): ${detail}`
      : `Contract error ${code} (${codeName})`;
    super(msg);
    this.name = "CygnusContractError";
    this.code = code;
    this.codeName = codeName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProgrammeNotFoundError extends CygnusContractError {
  constructor(detail?: string) {
    super(1, "ProgrammeNotFound", detail ?? "Programme does not exist");
    this.name = "ProgrammeNotFoundError";
  }
}

export class AlreadyClosedError extends CygnusContractError {
  constructor(detail?: string) {
    super(2, "AlreadyClosed", detail ?? "Programme has already ended and closed");
    this.name = "AlreadyClosedError";
  }
}

export class MilestoneIndexOutOfRangeError extends CygnusContractError {
  constructor(detail?: string) {
    super(3, "MilestoneIndexOutOfRange", detail ?? "Milestone index is out of bounds");
    this.name = "MilestoneIndexOutOfRangeError";
  }
}

export class MilestoneNotClaimableError extends CygnusContractError {
  constructor(detail?: string) {
    super(4, "MilestoneNotClaimable", detail ?? "Milestone is not in a claimable state");
    this.name = "MilestoneNotClaimableError";
  }
}

export class MilestoneNotClaimedError extends CygnusContractError {
  constructor(detail?: string) {
    super(5, "MilestoneNotClaimed", detail ?? "Milestone has not yet been claimed");
    this.name = "MilestoneNotClaimedError";
  }
}

export class MilestoneAlreadyResolvedError extends CygnusContractError {
  constructor(detail?: string) {
    super(
      6,
      "MilestoneAlreadyResolved",
      detail ?? "Milestone has already been approved or rejected",
    );
    this.name = "MilestoneAlreadyResolvedError";
  }
}

export class InsufficientFundingError extends CygnusContractError {
  constructor(detail?: string) {
    super(7, "InsufficientFunding", detail ?? "Programme has insufficient deposited funds");
    this.name = "InsufficientFundingError";
  }
}

export class InsufficientReleasedError extends CygnusContractError {
  constructor(detail?: string) {
    super(
      8,
      "InsufficientReleased",
      detail ?? "Insufficient released milestone funds available for disbursement",
    );
    this.name = "InsufficientReleasedError";
  }
}

export class NotEndedError extends CygnusContractError {
  constructor(detail?: string) {
    super(9, "NotEnded", detail ?? "Programme end date has not yet passed");
    this.name = "NotEndedError";
  }
}

export class InvalidAmountError extends CygnusContractError {
  constructor(detail?: string) {
    super(10, "InvalidAmount", detail ?? "Specified amount is zero or exceeds programme total");
    this.name = "InvalidAmountError";
  }
}

export class InvalidBatchError extends CygnusContractError {
  constructor(detail?: string) {
    super(11, "InvalidBatch", detail ?? "Batch root, total, or entry count does not match");
    this.name = "InvalidBatchError";
  }
}

export class ApproverKindUnimplementedError extends CygnusContractError {
  constructor(detail?: string) {
    super(
      12,
      "ApproverKindUnimplemented",
      detail ?? "Panel or Oracle approver is not yet implemented on-chain",
    );
    this.name = "ApproverKindUnimplementedError";
  }
}

export class NothingToRefundError extends CygnusContractError {
  constructor(detail?: string) {
    super(13, "NothingToRefund", detail ?? "No remaining undisbursed balance to refund");
    this.name = "NothingToRefundError";
  }
}

export class BatchIndexOutOfRangeError extends CygnusContractError {
  constructor(detail?: string) {
    super(14, "BatchIndexOutOfRange", detail ?? "Batch index is out of bounds");
    this.name = "BatchIndexOutOfRangeError";
  }
}

const ERROR_CLASS_MAP: Record<number, new (detail?: string) => CygnusContractError> = {
  1: ProgrammeNotFoundError,
  2: AlreadyClosedError,
  3: MilestoneIndexOutOfRangeError,
  4: MilestoneNotClaimableError,
  5: MilestoneNotClaimedError,
  6: MilestoneAlreadyResolvedError,
  7: InsufficientFundingError,
  8: InsufficientReleasedError,
  9: NotEndedError,
  10: InvalidAmountError,
  11: InvalidBatchError,
  12: ApproverKindUnimplementedError,
  13: NothingToRefundError,
  14: BatchIndexOutOfRangeError,
};

/**
 * Instantiate the specific typed CygnusContractError subclass for a given code.
 */
export function createContractError(code: number, detail?: string): CygnusContractError {
  const Cls = ERROR_CLASS_MAP[code];
  if (Cls) {
    return new Cls(detail);
  }
  const name = CONTRACT_ERROR_NAMES[code] ?? "UnknownContractError";
  return new CygnusContractError(code, name, detail);
}

/**
 * Parse an error from a Soroban RPC error object, string, or simulation result.
 * Returns a typed CygnusContractError subclass if recognised, otherwise undefined.
 */
export function parseContractError(err: unknown): CygnusContractError | undefined {
  if (err === null || err === undefined) return undefined;

  if (err instanceof CygnusContractError) return err;

  // If number passed directly (e.g. 1)
  if (typeof err === "number" && err in CONTRACT_ERROR_NAMES) {
    return createContractError(err);
  }

  // If object with { code: number } or { err: number }
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.code === "number" && obj.code in CONTRACT_ERROR_NAMES) {
      return createContractError(
        obj.code,
        typeof obj.message === "string" ? obj.message : undefined,
      );
    }
  }

  // Parse string error messages: e.g. "Error(Contract, #1)", "HostError: Error(Contract, #3)"
  const str = String(err instanceof Error ? err.message : err);
  const matchNum = str.match(/Error\(Contract,\s*#(\d+)\)/);
  if (matchNum) {
    const code = parseInt(matchNum[1], 10);
    return createContractError(code, str);
  }

  // Check name in string (e.g. "ProgrammeNotFound")
  for (const [codeStr, name] of Object.entries(CONTRACT_ERROR_NAMES)) {
    if (str.includes(name)) {
      return createContractError(Number(codeStr), str);
    }
  }

  return undefined;
}
