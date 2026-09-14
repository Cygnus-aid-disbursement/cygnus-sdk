// GENERATED FILE. Do not edit by hand.
// Regenerate against the current Testnet deployment with:
//   npm run bindings
// which runs:
//   stellar contract bindings typescript --network testnet \
//     --contract-id <deployments/testnet.json .contracts.programme> \
//     --output-dir <tmp> && cp <tmp>/src/index.ts src/generated/index.ts
import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBN6MNOWZISG6EXVCUQSGKASFSIBVDBZSVASI6FZYBLBMLHMQWL6SAL7",
  },
} as const;

export const Errors = {
  1: { message: "ProgrammeNotFound" },
  2: { message: "AlreadyClosed" },
  3: { message: "MilestoneIndexOutOfRange" },
  4: { message: "MilestoneNotClaimable" },
  5: { message: "MilestoneNotClaimed" },
  6: { message: "MilestoneAlreadyResolved" },
  7: { message: "InsufficientFunding" },
  8: { message: "InsufficientReleased" },
  9: { message: "NotEnded" },
  10: { message: "InvalidAmount" },
  11: { message: "InvalidBatch" },
  12: { message: "ApproverKindUnimplemented" },
  13: { message: "NothingToRefund" },
  14: { message: "BatchIndexOutOfRange" },
};

export interface Milestone {
  amount: i128;
  description_hash: Buffer;
  due_by: u64;
}

export interface Programme {
  approver: ApproverConfig;
  asset: string;
  batch_count: u32;
  created_at: u64;
  disbursed: i128;
  end_by: u64;
  funded: i128;
  id: u64;
  implementer: string;
  metadata_hash: Buffer;
  milestone_states: Array<MilestoneState>;
  milestones: Array<Milestone>;
  released: i128;
  sponsor: string;
  status: ProgrammeStatus;
  total: i128;
}

export type ApproverConfig =
  | { tag: "Single"; values: readonly [string] }
  | { tag: "Panel"; values: readonly [Array<string>, u32] }
  | { tag: "Oracle"; values: readonly [string] };

export interface MilestoneState {
  claimed_at: u64;
  claimed_late: boolean;
  evidence_hash: Option<Buffer>;
  reason_hash: Option<Buffer>;
  status: MilestoneStatus;
}

export type MilestoneStatus =
  | { tag: "Pending"; values: void }
  | { tag: "Claimed"; values: void }
  | { tag: "Approved"; values: void }
  | { tag: "Rejected"; values: void };

export type ProgrammeStatus = { tag: "Active"; values: void } | { tag: "Closed"; values: void };

export interface DisbursementBatch {
  count: u32;
  disbursed_at: u64;
  index: u32;
  root: Buffer;
  total: i128;
}

export interface Client {
  /**
   * Construct and simulate a fund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Move `amount` of the asset from the sponsor into the programme. Funding
   * may be partial and repeated up to the declared total.
   */
  fund: (
    { programme_id, amount }: { programme_id: u64; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Implementer claims a milestone with an evidence hash. A claim after the
   * due date is flagged but not blocked. A rejected milestone may be
   * re-claimed with fresh evidence.
   */
  claim: (
    {
      programme_id,
      milestone_index,
      evidence_hash,
    }: { programme_id: u64; milestone_index: u32; evidence_hash: Buffer },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a reject transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approver rejects a claimed milestone with a reason hash. The budget is
   * not released; the implementer may re-claim.
   */
  reject: (
    {
      programme_id,
      milestone_index,
      reason_hash,
    }: { programme_id: u64; milestone_index: u32; reason_hash: Buffer },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approver releases a claimed milestone's budget into the spendable pool.
   */
  approve: (
    { programme_id, milestone_index }: { programme_id: u64; milestone_index: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a disburse transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Implementer disburses a batch. The chain records the root, total and
   * count and moves `total` to the implementer for last-mile payout. It does
   * not record who was paid, and it does not prove they received anything.
   */
  disburse: (
    {
      programme_id,
      batch_root,
      total,
      count,
    }: { programme_id: u64; batch_root: Buffer; total: i128; count: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a get_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_batch: (
    { programme_id, batch_index }: { programme_id: u64; batch_index: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<DisbursementBatch>>>;

  /**
   * Construct and simulate a hash_leaf transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Canonical leaf hash. Exposed so the SDK cross-check test and external
   * auditors can confirm they reproduce the contract's encoding exactly.
   */
  hash_leaf: (
    { recipient_ref, amount }: { recipient_ref: Buffer; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Buffer>>;

  /**
   * Construct and simulate a get_programme transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_programme: (
    { programme_id }: { programme_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<Programme>>>;

  /**
   * Construct and simulate a create_programme transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a programme. Returns its id. The sponsor authorises creation so
   * nobody can bind another account as the funder of a programme.
   */
  create_programme: (
    {
      sponsor,
      implementer,
      asset,
      total,
      milestones,
      approver,
      metadata_hash,
    }: {
      sponsor: string;
      implementer: string;
      asset: string;
      total: i128;
      milestones: Array<Milestone>;
      approver: ApproverConfig;
      metadata_hash: Buffer;
    },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a refund_remainder transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * After the end date the sponsor recovers whatever was funded but never
   * disbursed, including released-but-unspent budget. Closes the programme.
   */
  refund_remainder: (
    { programme_id }: { programme_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a verify_inclusion transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Verify a beneficiary's inclusion in a published batch. `leaf` is the leaf
   * hash produced by the SDK from a salted recipient reference and an amount;
   * see `docs/protocol.md`. Returns false for an unknown programme or batch.
   */
  verify_inclusion: (
    {
      programme_id,
      batch_index,
      leaf,
      proof,
    }: { programme_id: u64; batch_index: u32; leaf: Buffer; proof: Array<Buffer> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<boolean>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAAAAAH1Nb3ZlIGBhbW91bnRgIG9mIHRoZSBhc3NldCBmcm9tIHRoZSBzcG9uc29yIGludG8gdGhlIHByb2dyYW1tZS4gRnVuZGluZwptYXkgYmUgcGFydGlhbCBhbmQgcmVwZWF0ZWQgdXAgdG8gdGhlIGRlY2xhcmVkIHRvdGFsLgAAAAAAAARmdW5kAAAAAgAAAAAAAAAMcHJvZ3JhbW1lX2lkAAAABgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAADkJhdGNoRGlzYnVyc2VkAAAAAAABAAAAD2JhdGNoX2Rpc2J1cnNlZAAAAAAFAAAAAAAAAAxwcm9ncmFtbWVfaWQAAAAGAAAAAQAAAAAAAAALYmF0Y2hfaW5kZXgAAAAABAAAAAAAAAAAAAAABHJvb3QAAAPuAAAAIAAAAAAAAAAAAAAABXRvdGFsAAAAAAAACwAAAAAAAAAAAAAABWNvdW50AAAAAAAABAAAAAAAAAAC",
        "AAAAAAAAAKhJbXBsZW1lbnRlciBjbGFpbXMgYSBtaWxlc3RvbmUgd2l0aCBhbiBldmlkZW5jZSBoYXNoLiBBIGNsYWltIGFmdGVyIHRoZQpkdWUgZGF0ZSBpcyBmbGFnZ2VkIGJ1dCBub3QgYmxvY2tlZC4gQSByZWplY3RlZCBtaWxlc3RvbmUgbWF5IGJlCnJlLWNsYWltZWQgd2l0aCBmcmVzaCBldmlkZW5jZS4AAAAFY2xhaW0AAAAAAAADAAAAAAAAAAxwcm9ncmFtbWVfaWQAAAAGAAAAAAAAAA9taWxlc3RvbmVfaW5kZXgAAAAABAAAAAAAAAANZXZpZGVuY2VfaGFzaAAAAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAAD1Byb2dyYW1tZUZ1bmRlZAAAAAABAAAAEHByb2dyYW1tZV9mdW5kZWQAAAACAAAAAAAAAAxwcm9ncmFtbWVfaWQAAAAGAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAAAAAAAHJBcHByb3ZlciByZWplY3RzIGEgY2xhaW1lZCBtaWxlc3RvbmUgd2l0aCBhIHJlYXNvbiBoYXNoLiBUaGUgYnVkZ2V0IGlzCm5vdCByZWxlYXNlZDsgdGhlIGltcGxlbWVudGVyIG1heSByZS1jbGFpbS4AAAAAAAZyZWplY3QAAAAAAAMAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAAAAAAAD21pbGVzdG9uZV9pbmRleAAAAAAEAAAAAAAAAAtyZWFzb25faGFzaAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABQAAAAAAAAAAAAAAEE1pbGVzdG9uZUNsYWltZWQAAAABAAAAEW1pbGVzdG9uZV9jbGFpbWVkAAAAAAAABAAAAAAAAAAMcHJvZ3JhbW1lX2lkAAAABgAAAAEAAAAAAAAAD21pbGVzdG9uZV9pbmRleAAAAAAEAAAAAAAAAAAAAAANZXZpZGVuY2VfaGFzaAAAAAAAA+4AAAAgAAAAAAAAAAAAAAAMY2xhaW1lZF9sYXRlAAAAAQAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEFByb2dyYW1tZUNyZWF0ZWQAAAABAAAAEXByb2dyYW1tZV9jcmVhdGVkAAAAAAAABAAAAAAAAAAMcHJvZ3JhbW1lX2lkAAAABgAAAAEAAAAAAAAAB3Nwb25zb3IAAAAAEwAAAAAAAAAAAAAAC2ltcGxlbWVudGVyAAAAABMAAAAAAAAAAAAAAAV0b3RhbAAAAAAAAAsAAAAAAAAAAg==",
        "AAAAAAAAAEdBcHByb3ZlciByZWxlYXNlcyBhIGNsYWltZWQgbWlsZXN0b25lJ3MgYnVkZ2V0IGludG8gdGhlIHNwZW5kYWJsZSBwb29sLgAAAAAHYXBwcm92ZQAAAAACAAAAAAAAAAxwcm9ncmFtbWVfaWQAAAAGAAAAAAAAAA9taWxlc3RvbmVfaW5kZXgAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABQAAAAAAAAAAAAAAEU1pbGVzdG9uZUFwcHJvdmVkAAAAAAAAAQAAABJtaWxlc3RvbmVfYXBwcm92ZWQAAAAAAAIAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAABAAAAAAAAAA9taWxlc3RvbmVfaW5kZXgAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEU1pbGVzdG9uZVJlamVjdGVkAAAAAAAAAQAAABJtaWxlc3RvbmVfcmVqZWN0ZWQAAAAAAAMAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAABAAAAAAAAAA9taWxlc3RvbmVfaW5kZXgAAAAABAAAAAAAAAAAAAAAC3JlYXNvbl9oYXNoAAAAA+4AAAAgAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAEVByb2dyYW1tZVJlZnVuZGVkAAAAAAAAAQAAABJwcm9ncmFtbWVfcmVmdW5kZWQAAAAAAAIAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAAAAAAANRJbXBsZW1lbnRlciBkaXNidXJzZXMgYSBiYXRjaC4gVGhlIGNoYWluIHJlY29yZHMgdGhlIHJvb3QsIHRvdGFsIGFuZApjb3VudCBhbmQgbW92ZXMgYHRvdGFsYCB0byB0aGUgaW1wbGVtZW50ZXIgZm9yIGxhc3QtbWlsZSBwYXlvdXQuIEl0IGRvZXMKbm90IHJlY29yZCB3aG8gd2FzIHBhaWQsIGFuZCBpdCBkb2VzIG5vdCBwcm92ZSB0aGV5IHJlY2VpdmVkIGFueXRoaW5nLgAAAAhkaXNidXJzZQAAAAQAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAAAAAAACmJhdGNoX3Jvb3QAAAAAA+4AAAAgAAAAAAAAAAV0b3RhbAAAAAAAAAsAAAAAAAAABWNvdW50AAAAAAAABAAAAAEAAAPpAAAABAAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X2JhdGNoAAAAAAAAAgAAAAAAAAAMcHJvZ3JhbW1lX2lkAAAABgAAAAAAAAALYmF0Y2hfaW5kZXgAAAAABAAAAAEAAAPoAAAH0AAAABFEaXNidXJzZW1lbnRCYXRjaAAAAA==",
        "AAAAAAAAAIpDYW5vbmljYWwgbGVhZiBoYXNoLiBFeHBvc2VkIHNvIHRoZSBTREsgY3Jvc3MtY2hlY2sgdGVzdCBhbmQgZXh0ZXJuYWwKYXVkaXRvcnMgY2FuIGNvbmZpcm0gdGhleSByZXByb2R1Y2UgdGhlIGNvbnRyYWN0J3MgZW5jb2RpbmcgZXhhY3RseS4AAAAAAAloYXNoX2xlYWYAAAAAAAACAAAAAAAAAA1yZWNpcGllbnRfcmVmAAAAAAAD7gAAACAAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPuAAAAIA==",
        "AAAAAAAAAAAAAAANZ2V0X3Byb2dyYW1tZQAAAAAAAAEAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAABAAAD6AAAB9AAAAAJUHJvZ3JhbW1lAAAA",
        "AAAAAAAAAIZSZWdpc3RlciBhIHByb2dyYW1tZS4gUmV0dXJucyBpdHMgaWQuIFRoZSBzcG9uc29yIGF1dGhvcmlzZXMgY3JlYXRpb24gc28Kbm9ib2R5IGNhbiBiaW5kIGFub3RoZXIgYWNjb3VudCBhcyB0aGUgZnVuZGVyIG9mIGEgcHJvZ3JhbW1lLgAAAAAAEGNyZWF0ZV9wcm9ncmFtbWUAAAAHAAAAAAAAAAdzcG9uc29yAAAAABMAAAAAAAAAC2ltcGxlbWVudGVyAAAAABMAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAFdG90YWwAAAAAAAALAAAAAAAAAAptaWxlc3RvbmVzAAAAAAPqAAAH0AAAAAlNaWxlc3RvbmUAAAAAAAAAAAAACGFwcHJvdmVyAAAH0AAAAA5BcHByb3ZlckNvbmZpZwAAAAAAAAAAAA1tZXRhZGF0YV9oYXNoAAAAAAAD7gAAACAAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAAI1BZnRlciB0aGUgZW5kIGRhdGUgdGhlIHNwb25zb3IgcmVjb3ZlcnMgd2hhdGV2ZXIgd2FzIGZ1bmRlZCBidXQgbmV2ZXIKZGlzYnVyc2VkLCBpbmNsdWRpbmcgcmVsZWFzZWQtYnV0LXVuc3BlbnQgYnVkZ2V0LiBDbG9zZXMgdGhlIHByb2dyYW1tZS4AAAAAAAAQcmVmdW5kX3JlbWFpbmRlcgAAAAEAAAAAAAAADHByb2dyYW1tZV9pZAAAAAYAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAANxWZXJpZnkgYSBiZW5lZmljaWFyeSdzIGluY2x1c2lvbiBpbiBhIHB1Ymxpc2hlZCBiYXRjaC4gYGxlYWZgIGlzIHRoZSBsZWFmCmhhc2ggcHJvZHVjZWQgYnkgdGhlIFNESyBmcm9tIGEgc2FsdGVkIHJlY2lwaWVudCByZWZlcmVuY2UgYW5kIGFuIGFtb3VudDsKc2VlIGBkb2NzL3Byb3RvY29sLm1kYC4gUmV0dXJucyBmYWxzZSBmb3IgYW4gdW5rbm93biBwcm9ncmFtbWUgb3IgYmF0Y2guAAAAEHZlcmlmeV9pbmNsdXNpb24AAAAEAAAAAAAAAAxwcm9ncmFtbWVfaWQAAAAGAAAAAAAAAAtiYXRjaF9pbmRleAAAAAAEAAAAAAAAAARsZWFmAAAD7gAAACAAAAAAAAAABXByb29mAAAAAAAD6gAAA+4AAAAgAAAAAQAAAAE=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADgAAAAAAAAARUHJvZ3JhbW1lTm90Rm91bmQAAAAAAAABAAAAAAAAAA1BbHJlYWR5Q2xvc2VkAAAAAAAAAgAAAAAAAAAYTWlsZXN0b25lSW5kZXhPdXRPZlJhbmdlAAAAAwAAAAAAAAAVTWlsZXN0b25lTm90Q2xhaW1hYmxlAAAAAAAABAAAAAAAAAATTWlsZXN0b25lTm90Q2xhaW1lZAAAAAAFAAAAAAAAABhNaWxlc3RvbmVBbHJlYWR5UmVzb2x2ZWQAAAAGAAAAAAAAABNJbnN1ZmZpY2llbnRGdW5kaW5nAAAAAAcAAAAAAAAAFEluc3VmZmljaWVudFJlbGVhc2VkAAAACAAAAAAAAAAITm90RW5kZWQAAAAJAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAACgAAAAAAAAAMSW52YWxpZEJhdGNoAAAACwAAAAAAAAAZQXBwcm92ZXJLaW5kVW5pbXBsZW1lbnRlZAAAAAAAAAwAAAAAAAAAD05vdGhpbmdUb1JlZnVuZAAAAAANAAAAAAAAABRCYXRjaEluZGV4T3V0T2ZSYW5nZQAAAA4=",
        "AAAAAQAAAAAAAAAAAAAACU1pbGVzdG9uZQAAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAQZGVzY3JpcHRpb25faGFzaAAAA+4AAAAgAAAAAAAAAAZkdWVfYnkAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAACVByb2dyYW1tZQAAAAAAABAAAAAAAAAACGFwcHJvdmVyAAAH0AAAAA5BcHByb3ZlckNvbmZpZwAAAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAAC2JhdGNoX2NvdW50AAAAAAQAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAACWRpc2J1cnNlZAAAAAAAAAsAAAAAAAAABmVuZF9ieQAAAAAABgAAAAAAAAAGZnVuZGVkAAAAAAALAAAAAAAAAAJpZAAAAAAABgAAAAAAAAALaW1wbGVtZW50ZXIAAAAAEwAAAAAAAAANbWV0YWRhdGFfaGFzaAAAAAAAA+4AAAAgAAAAAAAAABBtaWxlc3RvbmVfc3RhdGVzAAAD6gAAB9AAAAAOTWlsZXN0b25lU3RhdGUAAAAAAAAAAAAKbWlsZXN0b25lcwAAAAAD6gAAB9AAAAAJTWlsZXN0b25lAAAAAAAAAAAAAAhyZWxlYXNlZAAAAAsAAAAAAAAAB3Nwb25zb3IAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAAD1Byb2dyYW1tZVN0YXR1cwAAAAAAAAAABXRvdGFsAAAAAAAACw==",
        "AAAAAgAAAAAAAAAAAAAADkFwcHJvdmVyQ29uZmlnAAAAAAADAAAAAQAAAAAAAAAGU2luZ2xlAAAAAAABAAAAEwAAAAEAAAAAAAAABVBhbmVsAAAAAAAAAgAAA+oAAAATAAAABAAAAAEAAAAAAAAABk9yYWNsZQAAAAAAAQAAABM=",
        "AAAAAQAAAAAAAAAAAAAADk1pbGVzdG9uZVN0YXRlAAAAAAAFAAAAAAAAAApjbGFpbWVkX2F0AAAAAAAGAAAAAAAAAAxjbGFpbWVkX2xhdGUAAAABAAAAAAAAAA1ldmlkZW5jZV9oYXNoAAAAAAAD6AAAA+4AAAAgAAAAAAAAAAtyZWFzb25faGFzaAAAAAPoAAAD7gAAACAAAAAAAAAABnN0YXR1cwAAAAAH0AAAAA9NaWxlc3RvbmVTdGF0dXMA",
        "AAAAAgAAAAAAAAAAAAAAD01pbGVzdG9uZVN0YXR1cwAAAAAEAAAAAAAAAAAAAAAHUGVuZGluZwAAAAAAAAAAAAAAAAdDbGFpbWVkAAAAAAAAAAAAAAAACEFwcHJvdmVkAAAAAAAAAAAAAAAIUmVqZWN0ZWQ=",
        "AAAAAgAAAAAAAAAAAAAAD1Byb2dyYW1tZVN0YXR1cwAAAAACAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAZDbG9zZWQAAA==",
        "AAAAAQAAAAAAAAAAAAAAEURpc2J1cnNlbWVudEJhdGNoAAAAAAAABQAAAAAAAAAFY291bnQAAAAAAAAEAAAAAAAAAAxkaXNidXJzZWRfYXQAAAAGAAAAAAAAAAVpbmRleAAAAAAAAAQAAAAAAAAABHJvb3QAAAPuAAAAIAAAAAAAAAAFdG90YWwAAAAAAAAL",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    fund: this.txFromJSON<Result<void>>,
    claim: this.txFromJSON<Result<void>>,
    reject: this.txFromJSON<Result<void>>,
    approve: this.txFromJSON<Result<void>>,
    disburse: this.txFromJSON<Result<u32>>,
    get_batch: this.txFromJSON<Option<DisbursementBatch>>,
    hash_leaf: this.txFromJSON<Buffer>,
    get_programme: this.txFromJSON<Option<Programme>>,
    create_programme: this.txFromJSON<Result<u64>>,
    refund_remainder: this.txFromJSON<Result<i128>>,
    verify_inclusion: this.txFromJSON<boolean>,
  };
}
