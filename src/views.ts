import type {
  ApproverConfig,
  Milestone,
  MilestoneState,
  MilestoneStatus,
  Programme,
  ProgrammeStatus,
} from "./generated/index.js";

export type NormalizedMilestoneStatus = "pending" | "claimed" | "approved" | "rejected";
export type NormalizedProgrammeStatus = "active" | "closed";

export interface MilestoneView {
  index: number;
  amount: bigint;
  descriptionHashHex: string;
  dueBy: number;
  dueByIso: string;
  isOverdue: boolean;
  status: NormalizedMilestoneStatus;
  claimedAt?: number;
  claimedAtIso?: string;
  claimedLate?: boolean;
  evidenceHashHex?: string;
  reasonHashHex?: string;
}

export interface ProgrammeView {
  id: bigint;
  sponsor: string;
  implementer: string;
  asset: string;
  total: bigint;
  funded: bigint;
  released: bigint;
  disbursed: bigint;
  remainingToFund: bigint;
  remainingSpendable: bigint;
  fundedPercentage: number;
  releasedPercentage: number;
  disbursedPercentage: number;
  isFullyFunded: boolean;
  isFullyDisbursed: boolean;
  createdAt: number;
  createdAtIso: string;
  endBy: number;
  endByIso: string;
  isEnded: boolean;
  batchCount: number;
  status: NormalizedProgrammeStatus;
  approverSummary: string;
  metadataHashHex: string;
  milestones: MilestoneView[];
}

function calcPercentage(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  const pct = Number((numerator * 10000n) / denominator) / 100;
  return Math.min(Math.max(pct, 0), 100);
}

function isoStringFromUnixSeconds(seconds: number | bigint): string {
  return new Date(Number(seconds) * 1000).toISOString();
}

export function formatApproverConfig(config: ApproverConfig): string {
  switch (config.tag) {
    case "Single":
      return `Single(${config.values[0]})`;
    case "Panel": {
      const [members, threshold] = config.values;
      return `Panel(${threshold} of ${members.length})`;
    }
    case "Oracle":
      return `Oracle(${config.values[0]})`;
    default:
      return "Unknown";
  }
}

export function parseMilestoneStatus(status?: MilestoneStatus): NormalizedMilestoneStatus {
  if (!status) return "pending";
  return status.tag.toLowerCase() as NormalizedMilestoneStatus;
}

export function parseProgrammeStatus(status: ProgrammeStatus): NormalizedProgrammeStatus {
  return status.tag.toLowerCase() as NormalizedProgrammeStatus;
}

export function normalizeMilestone(
  milestone: Milestone,
  index: number,
  state?: MilestoneState,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): MilestoneView {
  const dueBy = Number(milestone.due_by);
  const status = parseMilestoneStatus(state?.status);
  const isOverdue = status === "pending" && nowSeconds > dueBy;

  const view: MilestoneView = {
    index,
    amount: milestone.amount,
    descriptionHashHex: Buffer.from(milestone.description_hash).toString("hex"),
    dueBy,
    dueByIso: isoStringFromUnixSeconds(dueBy),
    isOverdue,
    status,
  };

  if (state) {
    if (state.claimed_at) {
      const claimedAt = Number(state.claimed_at);
      view.claimedAt = claimedAt;
      view.claimedAtIso = isoStringFromUnixSeconds(claimedAt);
    }
    if (state.claimed_late !== undefined) {
      view.claimedLate = state.claimed_late;
    }
    if (state.evidence_hash) {
      view.evidenceHashHex = Buffer.from(state.evidence_hash).toString("hex");
    }
    if (state.reason_hash) {
      view.reasonHashHex = Buffer.from(state.reason_hash).toString("hex");
    }
  }

  return view;
}

export function normalizeProgramme(
  programme: Programme,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): ProgrammeView {
  const createdAt = Number(programme.created_at);
  const endBy = Number(programme.end_by);
  const isEnded = nowSeconds > endBy;

  const total = programme.total;
  const funded = programme.funded;
  const released = programme.released;
  const disbursed = programme.disbursed;

  const remainingToFund = total > funded ? total - funded : 0n;
  const remainingSpendable = released > disbursed ? released - disbursed : 0n;

  const milestones: MilestoneView[] = programme.milestones.map((m, i) =>
    normalizeMilestone(m, i, programme.milestone_states[i], nowSeconds),
  );

  return {
    id: programme.id,
    sponsor: programme.sponsor,
    implementer: programme.implementer,
    asset: programme.asset,
    total,
    funded,
    released,
    disbursed,
    remainingToFund,
    remainingSpendable,
    fundedPercentage: calcPercentage(funded, total),
    releasedPercentage: calcPercentage(released, total),
    disbursedPercentage: calcPercentage(disbursed, total),
    isFullyFunded: total > 0n && funded >= total,
    isFullyDisbursed: total > 0n && disbursed >= total,
    createdAt,
    createdAtIso: isoStringFromUnixSeconds(createdAt),
    endBy,
    endByIso: isoStringFromUnixSeconds(endBy),
    isEnded,
    batchCount: Number(programme.batch_count),
    status: parseProgrammeStatus(programme.status),
    approverSummary: formatApproverConfig(programme.approver),
    metadataHashHex: Buffer.from(programme.metadata_hash).toString("hex"),
    milestones,
  };
}
