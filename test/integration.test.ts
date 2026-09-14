import { describe, expect, it } from "vitest";
import { Asset, Keypair } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import { Cygnus } from "../src/client.js";
import { buildBatch, inclusionProof } from "../src/batch.js";

// Testnet cross-check. Skipped unless STELLAR_SECRET holds a funded Testnet key,
// because Testnet resets and rate limits make it a poor gate on every pull
// request. This is the test that proves the SDK's Merkle construction and the
// contract's verification agree on a live network.
const secret = process.env.STELLAR_SECRET;
const run = secret ? describe : describe.skip;

run("cross-check against Testnet", () => {
  const PASSPHRASE = "Test SDF Network ; September 2015";
  const salt = new TextEncoder().encode("sdk-integration-salt");
  const h32 = (b: number) => Buffer.alloc(32, b);

  it("builds a batch the contract verifies leaf by leaf", async () => {
    const kp = Keypair.fromSecret(secret!);
    const cy = new Cygnus({
      publicKey: kp.publicKey(),
      signTransaction: basicNodeSigner(kp, PASSPHRASE).signTransaction,
    });
    const me = kp.publicKey();
    const asset = Asset.native().contractId(PASSPHRASE);
    const past = BigInt(Math.floor(Date.now() / 1000) - 3600);

    const create = await cy.createProgramme({
      sponsor: me,
      implementer: me,
      asset,
      total: 30n,
      milestones: [{ amount: 30n, description_hash: h32(1), due_by: past }],
      approver: { tag: "Single", values: [me] },
      metadataHash: h32(9),
    });
    const programmeId = (await create.signAndSend()).result.unwrap();

    await (await cy.fund(programmeId, 30n)).signAndSend();
    await (await cy.claim(programmeId, 0, h32(2))).signAndSend();
    await (await cy.approve(programmeId, 0)).signAndSend();

    const entries = [
      { reference: "alpha", amount: 10n },
      { reference: "bravo", amount: 10n },
      { reference: "charlie", amount: 10n },
    ];
    const batch = buildBatch(entries, salt);

    // The contract reproduces the SDK's leaf encoding exactly.
    for (let i = 0; i < entries.length; i++) {
      const onChain = await cy.hashLeafOnChain(batch.recipientRefs[i], entries[i].amount);
      expect(onChain.equals(batch.leaves[i])).toBe(true);
    }

    const batchIndex = (
      await (await cy.disburse(programmeId, batch.root, batch.total, batch.count)).signAndSend()
    ).result.unwrap();

    for (let i = 0; i < entries.length; i++) {
      const proof = inclusionProof(batch, i);
      const ok = await cy.verifyInclusion(programmeId, batchIndex, batch.leaves[i], proof);
      expect(ok).toBe(true);
    }
  }, 180_000);
});
