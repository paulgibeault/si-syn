// Stage the deploy artifact — the per-app half of the fleet contract
// (GAME_INTEGRATION §13a). tools/verify-artifact.mjs is identical fleet-wide
// and calls into this; only the way an artifact gets produced differs.
//
// This app is bundled: index.html is a vite entry whose module graph gets
// rewritten and hashed, so there is no copy-tracked-files version of it —
// staging IS the build. An unresolved import fails vite itself, which is why
// the reference half of the verification is largely satisfied by
// construction here; the verifier still checks what actually landed in the
// artifact, including public/ assets and the manifest.
//
// Usage: node tools/stage.mjs <outDir>
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function stage(outDir) {
  const out = path.resolve(ROOT, outDir);
  execFileSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"],
    { cwd: ROOT, stdio: "inherit" });
  return { outDir: out };
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const out = process.argv[2];
  if (!out) { console.error("usage: node tools/stage.mjs <outDir>"); process.exit(1); }
  stage(out);
}
