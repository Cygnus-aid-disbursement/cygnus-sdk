// tsc does not copy non-TS files into dist, so the vendored deployment JSON that
// deployments.ts imports must be copied by hand after a build.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
copyFileSync("src/deployments.json", "dist/deployments.json");
console.log("copied src/deployments.json -> dist/deployments.json");
