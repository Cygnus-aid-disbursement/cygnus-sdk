import { describe, expect, it } from "vitest";
import { deployments } from "../src/deployments.js";

describe("deployments", () => {
  it("exposes testnet deployment information", () => {
    expect(deployments.testnet).toBeDefined();
    expect(deployments.testnet.network).toBe("testnet");
    expect(deployments.testnet.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(deployments.testnet.contracts.programme).toMatch(/^C[A-Z0-9]{55}$/);
    expect(deployments.testnet.deployedAt).toBeDefined();
  });
});
