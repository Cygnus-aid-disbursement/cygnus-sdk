export { Cygnus } from "./client.js";
export type { CygnusOptions, CygnusEvent } from "./client.js";

export { deployments } from "./deployments.js";
export type { Deployment, NetworkName } from "./deployments.js";

export {
  buildBatch,
  inclusionProof,
  verifyProof,
  hashLeaf,
  hashNode,
  saltRecipientRef,
  amountToBe16,
} from "./batch.js";
export type { Batch, BatchEntry } from "./batch.js";

export {
  canonicalJson,
  hashProgrammeMetadata,
  hashMilestoneDescription,
  hashEvidence,
  hashRejectionReason,
  DOMAINS,
} from "./hashing.js";
export type { JsonValue } from "./hashing.js";

export { StubAnchor, NotImplementedError } from "./anchor.js";
export type { Anchor, Quote, PayoutRequest, PayoutState, PayoutStatus } from "./anchor.js";

// Re-export the generated contract types so consumers get one import surface.
export type {
  Programme,
  Milestone,
  MilestoneState,
  MilestoneStatus,
  ProgrammeStatus,
  ApproverConfig,
  DisbursementBatch,
} from "./generated/index.js";
export { Errors } from "./generated/index.js";
