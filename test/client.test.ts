import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
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

  describe("fromEnv", () => {
    it("creates client from empty env using defaults", () => {
      const client = Cygnus.fromEnv({});
      expect(client.contractId).toBe("CBN6MNOWZISG6EXVCUQSGKASFSIBVDBZSVASI6FZYBLBMLHMQWL6SAL7");
      expect(client.networkPassphrase).toBe("Test SDF Network ; September 2015");
    });

    it("reads custom network and contractId from environment", () => {
      const customId = "CB555555555555555555555555555555555555555555555555555555";
      const customPassphrase = "Custom Passphrase SDF";
      const client = Cygnus.fromEnv({
        CYGNUS_CONTRACT_ID: customId,
        CYGNUS_NETWORK_PASSPHRASE: customPassphrase,
      });
      expect(client.contractId).toBe(customId);
      expect(client.networkPassphrase).toBe(customPassphrase);
    });

    it("configures signer automatically when STELLAR_SECRET is provided", () => {
      const kp = Keypair.random();
      const client = Cygnus.fromEnv({
        STELLAR_SECRET: kp.secret(),
      });
      expect(client.raw.options.publicKey).toBe(kp.publicKey());
      expect(client.raw.options.signTransaction).toBeDefined();
    });
  });
});
