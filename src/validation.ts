import { StrKey } from "@stellar/stellar-sdk";
import { ValidationError } from "./errors.js";

const MAX_I128 = (1n << 127n) - 1n;
const MAX_BATCH_ENTRIES = 65_535;

/**
 * Checks whether the string is a valid Stellar Ed25519 public key (starts with G).
 */
export function isValidStellarPublicKey(address: string): boolean {
  if (typeof address !== "string" || address.length !== 56 || !address.startsWith("G")) {
    return false;
  }
  return StrKey.isValidEd25519PublicKey(address);
}

/**
 * Checks whether the string is a valid Stellar Soroban Contract ID (starts with C).
 */
export function isValidContractAddress(address: string): boolean {
  if (typeof address !== "string" || address.length !== 56 || !address.startsWith("C")) {
    return false;
  }
  return StrKey.isValidContract(address);
}

/**
 * Checks whether the string is a valid Stellar address (either account G... or contract C...).
 */
export function isValidStellarAddress(address: string): boolean {
  return isValidStellarPublicKey(address) || isValidContractAddress(address);
}

/**
 * Asserts that an address is a valid Stellar public key or contract address.
 * Throws a ValidationError if invalid.
 */
export function validateStellarAddress(address: string, fieldName = "address"): string {
  if (!isValidStellarAddress(address)) {
    throw new ValidationError(
      `Invalid Stellar address "${address}". Must be a valid 56-character G... or C... address with correct checksum`,
      fieldName,
    );
  }
  return address;
}

export interface AmountValidationOptions {
  strictlyPositive?: boolean;
  max?: bigint;
}

/**
 * Asserts that an amount is within valid Soroban signed i128 range [0, 2^127 - 1].
 * Optionally enforces strictly positive amounts (> 0).
 */
export function validateAmount(
  amount: bigint,
  fieldName = "amount",
  options: AmountValidationOptions = {},
): bigint {
  if (typeof amount !== "bigint") {
    throw new ValidationError("Amount must be a bigint", fieldName);
  }

  const strictlyPositive = options.strictlyPositive ?? true;
  if (strictlyPositive && amount <= 0n) {
    throw new ValidationError("Amount must be strictly positive (> 0)", fieldName);
  } else if (!strictlyPositive && amount < 0n) {
    throw new ValidationError("Amount cannot be negative", fieldName);
  }

  const max = options.max ?? MAX_I128;
  if (amount > max) {
    throw new ValidationError(
      `Amount exceeds maximum allowed limit (${max.toString()})`,
      fieldName,
    );
  }

  return amount;
}

/**
 * Asserts that a salt or recipient reference is a 32-byte Buffer or Uint8Array.
 */
export function validateSalt(salt: Buffer | Uint8Array, fieldName = "salt"): Buffer {
  if (!salt || !(salt instanceof Uint8Array || Buffer.isBuffer(salt))) {
    throw new ValidationError("Salt must be a Buffer or Uint8Array", fieldName);
  }
  if (salt.length !== 32) {
    throw new ValidationError(`Salt must be exactly 32 bytes (got ${salt.length})`, fieldName);
  }
  return Buffer.isBuffer(salt) ? salt : Buffer.from(salt);
}

/**
 * Asserts that batch entries are non-empty and do not exceed capacity.
 */
export function validateBatchEntriesCount(count: number, fieldName = "batch"): void {
  if (count === 0) {
    throw new ValidationError("Batch cannot be empty", fieldName);
  }
  if (count > MAX_BATCH_ENTRIES) {
    throw new ValidationError(
      `Batch contains ${count} entries, exceeding limit of ${MAX_BATCH_ENTRIES}`,
      fieldName,
    );
  }
}
