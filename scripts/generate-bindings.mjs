// Regenerate the committed contract bindings and refresh the vendored deployment
// against the current Testnet deployment. Run after the contract's interface
// changes and a new deploy. Requires the Stellar CLI 27+.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const deployment = JSON.parse(readFileSync("src/deployments.json", "utf8"));
const contractId = deployment.contracts.programme;
const out = mkdtempSync(join(tmpdir(), "cygnus-bindings-"));

console.log(`Generating bindings for ${contractId}...`);
execFileSync(
  "stellar",
  [
    "contract",
    "bindings",
    "typescript",
    "--network",
    "testnet",
    "--contract-id",
    contractId,
    "--output-dir",
    out,
  ],
  { stdio: "inherit" },
);

copyFileSync(join(out, "src", "index.ts"), "src/generated/index.ts");
console.log("Updated src/generated/index.ts");
console.log("Re-add the GENERATED banner at the top of the file after regenerating.");
