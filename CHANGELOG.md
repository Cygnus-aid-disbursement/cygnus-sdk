# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-rc.1] - 2026-11-09

### Added
- **Core Client**: Strongly typed `Cygnus` class communicating with deployed Stellar Soroban contracts.
- **Environment Factory**: `Cygnus.fromEnv()` reading standard Stellar environment variables and auto-configuring `basicNodeSigner`.
- **Merkle Batch Protocol**: Deterministic batch construction matching `merkle.rs` byte-for-byte, supporting per-programme recipient salting, `i128` two's-complement amount encoding, and odd-tail node elevation.
- **Beneficiary Receipts**: Portable offline receipt generation (`createReceipt`, `createBatchReceipts`) and cryptographic verification (`verifyReceipt`) without on-chain beneficiary disclosure.
- **View Normalizers**: Ergonomic display models for programmes and milestones (`normalizeProgramme`, `normalizeMilestone`, `formatApproverConfig`, `isFullyFunded`, `isFullyDisbursed`).
- **Resilient RPC Retry**: `withRetry` utility featuring exponential backoff with decorrelated full jitter and `AbortSignal` cancellation.
- **Event Streaming**: `subscribeToEvents` subscription loop streaming real-time and historical contract events with ledger cursor advancement.
- **Anchor Reference**: `MemoryAnchor` simulation engine providing quotes, expiration checks, amount matching, payout lifecycle state transitions, and test reset.
- **Typed Errors**: Hierarchical error system (`CygnusError`, `CygnusContractError`, `ValidationError`) covering all 14 Soroban contract error codes and input validation.
- **Runtime Validation**: Stringent validators for Stellar public keys (`G...`), contract IDs (`C...`), `i128` amounts, and 32-byte salts.
- **Continuous Integration**: GitHub Actions workflow testing matrix across Node 20 and 22 with dependency security audit.
