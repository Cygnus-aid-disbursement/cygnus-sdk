// tsc does not copy non-TS files into dist, so the vendored deployment JSON that
// deployments.ts imports must be copied by hand after a build.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

if (!existsSync("src/deployments.json")) {
  console.error("Error: src/deployments.json not found");
  process.exit(1);
}

mkdirSync("dist", { recursive: true });
copyFileSync("src/deployments.json", "dist/deployments.json");
console.log("copied src/deployments.json -> dist/deployments.json");
