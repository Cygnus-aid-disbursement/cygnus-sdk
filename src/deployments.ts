import testnet from "./deployments.json" with { type: "json" };

// The protocol repository owns deployment truth. This file is vendored from
// cygnus-contracts/deployments/testnet.json so an application never hardcodes a
// contract id. A redeployment is a three-step release: deploy from the protocol
// repo, bump this file and the SDK, then bump the app. See docs/multi-repo.md.

export interface Deployment {
  network: string;
  networkPassphrase: string;
  deployedAt: string;
  commit: string;
  contracts: { programme: string };
}

export const deployments = { testnet: testnet as Deployment } as const;

export type NetworkName = keyof typeof deployments;
