import { Keypair, rpc, scValToNative } from "@stellar/stellar-sdk";
import { basicNodeSigner, type ClientOptions } from "@stellar/stellar-sdk/contract";
import { withRetry, type RetryOptions } from "./retry.js";
import {
  Client as GeneratedClient,
  type ApproverConfig,
  type DisbursementBatch,
  type Milestone,
  type Programme,
} from "./generated/index.js";
import { deployments, type NetworkName } from "./deployments.js";

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";

export interface CygnusOptions {
  /** Named deployment to target. Defaults to "testnet"; there is no mainnet. */
  network?: NetworkName;
  /** Override the contract id. Defaults to the vendored deployment truth. */
  contractId?: string;
  rpcUrl?: string;
  networkPassphrase?: string;
  /** Account that pays for and authorises transactions, for write calls. */
  publicKey?: string;
  signTransaction?: ClientOptions["signTransaction"];
  allowHttp?: boolean;
  /** Configure RPC retry options. Set to false to disable retries. */
  retry?: RetryOptions | boolean;
}

// Event names match the #[contractevent] structs in the contract. programme_id
// is a topic; the rest is data.
export type CygnusEvent =
  | {
      type: "ProgrammeCreated";
      programmeId: bigint;
      sponsor: string;
      implementer: string;
      total: bigint;
    }
  | { type: "ProgrammeFunded"; programmeId: bigint; amount: bigint }
  | {
      type: "MilestoneClaimed";
      programmeId: bigint;
      milestoneIndex: number;
      evidenceHash: Buffer;
      claimedLate: boolean;
    }
  | { type: "MilestoneApproved"; programmeId: bigint; milestoneIndex: number }
  | { type: "MilestoneRejected"; programmeId: bigint; milestoneIndex: number; reasonHash: Buffer }
  | {
      type: "BatchDisbursed";
      programmeId: bigint;
      batchIndex: number;
      root: Buffer;
      total: bigint;
      count: number;
    }
  | { type: "ProgrammeRefunded"; programmeId: bigint; amount: bigint };

/**
 * Typed client for the Cygnus programme contract. Read calls return their value
 * directly; write calls return an AssembledTransaction the caller signs and
 * sends with a configured signer.
 */
export class Cygnus {
  /** The generated binding client, for anything this wrapper does not cover. */
  readonly raw: GeneratedClient;
  readonly contractId: string;
  readonly networkPassphrase: string;
  readonly retryOptions: RetryOptions | false;
  private readonly rpcUrl: string;

  constructor(options: CygnusOptions = {}) {
    const network = options.network ?? "testnet";
    const deployment = deployments[network];
    if (!deployment) {
      throw new Error(
        `Unknown network "${String(network)}". Available networks: ${Object.keys(deployments).join(", ")}`,
      );
    }
    this.contractId = options.contractId ?? deployment.contracts.programme;
    this.networkPassphrase = options.networkPassphrase ?? deployment.networkPassphrase;
    this.rpcUrl = options.rpcUrl ?? DEFAULT_RPC_URL;
    this.retryOptions =
      options.retry === false ? false : typeof options.retry === "object" ? options.retry : {};
    this.raw = new GeneratedClient({
      contractId: this.contractId,
      networkPassphrase: this.networkPassphrase,
      rpcUrl: this.rpcUrl,
      publicKey: options.publicKey,
      signTransaction: options.signTransaction,
      allowHttp: options.allowHttp,
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (this.retryOptions === false) {
      return fn();
    }
    return withRetry(fn, this.retryOptions);
  }

  /**
   * Instantiate a Cygnus client from environment variables.
   * Reads:
   * - CYGNUS_NETWORK (defaults to "testnet")
   * - CYGNUS_CONTRACT_ID
   * - CYGNUS_RPC_URL
   * - CYGNUS_NETWORK_PASSPHRASE
   * - STELLAR_SECRET (automatically configures Keypair signer)
   * - STELLAR_PUBLIC_KEY
   * - CYGNUS_ALLOW_HTTP ("true" or "1")
   */
  static fromEnv(env: Record<string, string | undefined> = process.env): Cygnus {
    const network = (env.CYGNUS_NETWORK as NetworkName) || "testnet";
    const contractId = env.CYGNUS_CONTRACT_ID;
    const rpcUrl = env.CYGNUS_RPC_URL;
    const networkPassphrase = env.CYGNUS_NETWORK_PASSPHRASE;
    const allowHttp = env.CYGNUS_ALLOW_HTTP === "true" || env.CYGNUS_ALLOW_HTTP === "1";
    const retry = env.CYGNUS_RETRY === "false" ? false : undefined;

    let publicKey = env.STELLAR_PUBLIC_KEY;
    let signTransaction: ClientOptions["signTransaction"] | undefined = undefined;

    const secret = env.STELLAR_SECRET;
    if (secret) {
      const kp = Keypair.fromSecret(secret);
      publicKey = publicKey ?? kp.publicKey();
      const passphrase =
        networkPassphrase ??
        deployments[network]?.networkPassphrase ??
        deployments.testnet.networkPassphrase;
      signTransaction = basicNodeSigner(kp, passphrase).signTransaction;
    }

    return new Cygnus({
      network,
      contractId,
      rpcUrl,
      networkPassphrase,
      publicKey,
      signTransaction,
      allowHttp,
      retry,
    });
  }

  // --- write calls: return an AssembledTransaction to sign and send ---------

  createProgramme(args: {
    sponsor: string;
    implementer: string;
    asset: string;
    total: bigint;
    milestones: Milestone[];
    approver: ApproverConfig;
    metadataHash: Buffer;
  }) {
    return this.raw.create_programme({
      sponsor: args.sponsor,
      implementer: args.implementer,
      asset: args.asset,
      total: args.total,
      milestones: args.milestones,
      approver: args.approver,
      metadata_hash: args.metadataHash,
    });
  }

  fund(programmeId: bigint, amount: bigint) {
    return this.raw.fund({ programme_id: programmeId, amount });
  }

  claim(programmeId: bigint, milestoneIndex: number, evidenceHash: Buffer) {
    return this.raw.claim({
      programme_id: programmeId,
      milestone_index: milestoneIndex,
      evidence_hash: evidenceHash,
    });
  }

  approve(programmeId: bigint, milestoneIndex: number) {
    return this.raw.approve({ programme_id: programmeId, milestone_index: milestoneIndex });
  }

  reject(programmeId: bigint, milestoneIndex: number, reasonHash: Buffer) {
    return this.raw.reject({
      programme_id: programmeId,
      milestone_index: milestoneIndex,
      reason_hash: reasonHash,
    });
  }

  disburse(programmeId: bigint, batchRoot: Buffer, total: bigint, count: number) {
    return this.raw.disburse({
      programme_id: programmeId,
      batch_root: batchRoot,
      total,
      count,
    });
  }

  refundRemainder(programmeId: bigint) {
    return this.raw.refund_remainder({ programme_id: programmeId });
  }

  // --- read calls: simulate and return the value ---------------------------

  async getProgramme(programmeId: bigint): Promise<Programme | undefined> {
    return this.executeWithRetry(async () => {
      return (await this.raw.get_programme({ programme_id: programmeId })).result;
    });
  }

  async getBatch(programmeId: bigint, batchIndex: number): Promise<DisbursementBatch | undefined> {
    return this.executeWithRetry(async () => {
      return (await this.raw.get_batch({ programme_id: programmeId, batch_index: batchIndex }))
        .result;
    });
  }

  async verifyInclusion(
    programmeId: bigint,
    batchIndex: number,
    leaf: Buffer,
    proof: Buffer[],
  ): Promise<boolean> {
    return this.executeWithRetry(async () => {
      return (
        await this.raw.verify_inclusion({
          programme_id: programmeId,
          batch_index: batchIndex,
          leaf,
          proof,
        })
      ).result;
    });
  }

  /** The contract's canonical leaf hash, for cross-checking the SDK's own. */
  async hashLeafOnChain(recipientRef: Buffer, amount: bigint): Promise<Buffer> {
    return this.executeWithRetry(async () => {
      return (await this.raw.hash_leaf({ recipient_ref: recipientRef, amount })).result;
    });
  }

  /**
   * Poll a programme until `predicate` holds or the timeout elapses. Useful
   * after sending a transaction, when the ledger needs a moment to settle.
   */
  async waitForState(
    programmeId: bigint,
    predicate: (programme: Programme) => boolean,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<Programme> {
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const intervalMs = opts.intervalMs ?? 2_000;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const programme = await this.getProgramme(programmeId);
      if (programme && predicate(programme)) return programme;
      if (Date.now() >= deadline) {
        throw new Error(`waitForState timed out for programme ${programmeId}`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  /**
   * Fetch and decode this contract's events from `startLedger`. Streaming and
   * pagination beyond a single page are left to the caller via `raw` and the
   * underlying rpc server.
   */
  async events(startLedger: number): Promise<CygnusEvent[]> {
    return this.executeWithRetry(async () => {
      const server = new rpc.Server(this.rpcUrl, { allowHttp: this.rpcUrl.startsWith("http:") });
      const { events } = await server.getEvents({
        startLedger,
        filters: [{ type: "contract", contractIds: [this.contractId] }],
      });
      return events
        .map((e) =>
          decodeEvent(
            e.topic.map((t) => scValToNative(t)),
            scValToNative(e.value),
          ),
        )
        .filter((e): e is CygnusEvent => e !== undefined);
    });
  }
}

export function decodeEvent(
  topics: unknown[],
  data: Record<string, unknown> | unknown,
): CygnusEvent | undefined {
  if (!Array.isArray(topics) || topics.length < 2) return undefined;
  if (!data || typeof data !== "object") return undefined;
  const name = topics[0];
  const programmeId =
    typeof topics[1] === "bigint" ? topics[1] : BigInt(topics[1] as number | string);
  const d = data as Record<string, unknown>;
  switch (name) {
    case "ProgrammeCreated":
      if (!d.sponsor || !d.implementer || d.total === undefined) return undefined;
      return {
        type: "ProgrammeCreated",
        programmeId,
        sponsor: String(d.sponsor),
        implementer: String(d.implementer),
        total: BigInt(d.total as number | string | bigint),
      };
    case "ProgrammeFunded":
      if (d.amount === undefined) return undefined;
      return {
        type: "ProgrammeFunded",
        programmeId,
        amount: BigInt(d.amount as number | string | bigint),
      };
    case "MilestoneClaimed":
      if (d.milestone_index === undefined || !d.evidence_hash) return undefined;
      return {
        type: "MilestoneClaimed",
        programmeId,
        milestoneIndex: Number(d.milestone_index),
        evidenceHash: d.evidence_hash as Buffer,
        claimedLate: Boolean(d.claimed_late),
      };
    case "MilestoneApproved":
      if (d.milestone_index === undefined) return undefined;
      return { type: "MilestoneApproved", programmeId, milestoneIndex: Number(d.milestone_index) };
    case "MilestoneRejected":
      if (d.milestone_index === undefined || !d.reason_hash) return undefined;
      return {
        type: "MilestoneRejected",
        programmeId,
        milestoneIndex: Number(d.milestone_index),
        reasonHash: d.reason_hash as Buffer,
      };
    case "BatchDisbursed":
      if (
        d.batch_index === undefined ||
        !d.root ||
        d.total === undefined ||
        d.count === undefined
      ) {
        return undefined;
      }
      return {
        type: "BatchDisbursed",
        programmeId,
        batchIndex: Number(d.batch_index),
        root: d.root as Buffer,
        total: BigInt(d.total as number | string | bigint),
        count: Number(d.count),
      };
    case "ProgrammeRefunded":
      if (d.amount === undefined) return undefined;
      return {
        type: "ProgrammeRefunded",
        programmeId,
        amount: BigInt(d.amount as number | string | bigint),
      };
    default:
      return undefined;
  }
}
