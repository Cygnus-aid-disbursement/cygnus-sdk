import { describe, expect, it } from "vitest";
import { Cygnus } from "../src/client.js";

describe("Cygnus client constructor", () => {
  it("initializes with default testnet settings", () => {
    const client = new Cygnus();
    expect(client.contractId).toBe("CBN6MNOWZISG6EXVCUQSGKASFSIBVDBZSVASI6FZYBLBMLHMQWL6SAL7");
    expect(client.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(client.raw).toBeDefined();
  });

  it("accepts custom contractId and networkPassphrase overrides", () => {
    const customContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const customPassphrase = "Custom Passphrase";
    const client = new Cygnus({
      contractId: customContractId,
      networkPassphrase: customPassphrase,
    });
    expect(client.contractId).toBe(customContractId);
    expect(client.networkPassphrase).toBe(customPassphrase);
  });

  it("throws clear error when unknown network is specified", () => {
    expect(() => new Cygnus({ network: "mainnet" as any })).toThrow('Unknown network "mainnet"');
  });
});
