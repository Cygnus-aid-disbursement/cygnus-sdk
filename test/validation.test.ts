import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  isValidStellarPublicKey,
  isValidContractAddress,
  isValidStellarAddress,
  validateStellarAddress,
  validateAmount,
  validateSalt,
  validateBatchEntriesCount,
} from "../src/validation.js";
import { ValidationError } from "../src/errors.js";

describe("validation", () => {
  const validPublicKey = Keypair.random().publicKey();
  const validContractId = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

  describe("Stellar address validation", () => {
    it("identifies valid Ed25519 public keys", () => {
      expect(isValidStellarPublicKey(validPublicKey)).toBe(true);
      expect(isValidStellarPublicKey(validContractId)).toBe(false);
      expect(
        isValidStellarPublicKey("GB3K4Z2W2Q6KJZQ2665P7CVDYZL226W7GDT772DYRPT2F7S3B2EGY4L7"),
      ).toBe(false); // bad checksum
      expect(isValidStellarPublicKey("not-a-key")).toBe(false);
      expect(isValidStellarPublicKey("")).toBe(false);
    });

    it("identifies valid Contract IDs", () => {
      expect(isValidContractAddress(validContractId)).toBe(true);
      expect(isValidContractAddress(validPublicKey)).toBe(false);
      expect(
        isValidContractAddress("CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAX0"),
      ).toBe(false); // bad checksum
      expect(isValidContractAddress("not-a-contract")).toBe(false);
    });

    it("identifies any valid Stellar address", () => {
      expect(isValidStellarAddress(validPublicKey)).toBe(true);
      expect(isValidStellarAddress(validContractId)).toBe(true);
      expect(isValidStellarAddress("invalid")).toBe(false);
    });

    it("validateStellarAddress returns valid address or throws ValidationError", () => {
      expect(validateStellarAddress(validPublicKey)).toBe(validPublicKey);
      expect(validateStellarAddress(validContractId)).toBe(validContractId);
      expect(() => validateStellarAddress("bad-address", "recipient")).toThrow(ValidationError);
      expect(() => validateStellarAddress("bad-address", "recipient")).toThrow(
        "recipient: Invalid Stellar address",
      );
    });
  });

  describe("amount validation", () => {
    it("accepts strictly positive amounts by default", () => {
      expect(validateAmount(100n)).toBe(100n);
      expect(validateAmount(1n)).toBe(1n);
    });

    it("rejects non-positive amounts when strictlyPositive is true", () => {
      expect(() => validateAmount(0n, "payout")).toThrow(ValidationError);
      expect(() => validateAmount(0n, "payout")).toThrow(
        "payout: Amount must be strictly positive",
      );
      expect(() => validateAmount(-50n, "payout")).toThrow(ValidationError);
    });

    it("accepts zero when strictlyPositive is false", () => {
      expect(validateAmount(0n, "payout", { strictlyPositive: false })).toBe(0n);
      expect(() => validateAmount(-1n, "payout", { strictlyPositive: false })).toThrow(
        "Amount cannot be negative",
      );
    });

    it("rejects non-bigint values", () => {
      expect(() => validateAmount(100 as any)).toThrow("Amount must be a bigint");
    });

    it("rejects amounts exceeding i128 maximum", () => {
      const maxI128 = (1n << 127n) - 1n;
      expect(validateAmount(maxI128)).toBe(maxI128);
      expect(() => validateAmount(maxI128 + 1n)).toThrow("Amount exceeds maximum allowed limit");
    });
  });

  describe("salt validation", () => {
    it("accepts 32-byte buffers and uint8arrays", () => {
      const buf = Buffer.alloc(32, 1);
      const arr = new Uint8Array(32);
      expect(validateSalt(buf)).toEqual(buf);
      expect(validateSalt(arr)).toEqual(Buffer.from(arr));
    });

    it("rejects invalid lengths or non-binary types", () => {
      expect(() => validateSalt(Buffer.alloc(16), "salt")).toThrow(
        "salt: Salt must be exactly 32 bytes (got 16)",
      );
      expect(() => validateSalt("string-salt" as any)).toThrow(
        "Salt must be a Buffer or Uint8Array",
      );
      expect(() => validateSalt(null as any)).toThrow("Salt must be a Buffer or Uint8Array");
    });
  });

  describe("batch count validation", () => {
    it("accepts valid batch entry counts", () => {
      expect(() => validateBatchEntriesCount(1)).not.toThrow();
      expect(() => validateBatchEntriesCount(65_535)).not.toThrow();
    });

    it("rejects zero or overflow counts", () => {
      expect(() => validateBatchEntriesCount(0)).toThrow("Batch cannot be empty");
      expect(() => validateBatchEntriesCount(65_536)).toThrow("exceeding limit of 65535");
    });
  });
});
