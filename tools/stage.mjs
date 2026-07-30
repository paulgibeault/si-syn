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
import { injectPrecache } from "./inject-precache.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Published, deliberately not precached. This is the only knob on the
// generated list (tools/inject-precache.mjs), and it is reviewed rather than
// silent: tools/verify-artifact.mjs fails the build on any published file that
// is neither cached nor named here.
//
// Nothing but the pack the audio layer fetches lazily; the bundled graph is
// content-hashed and now lists itself, which is what retired this app's
// shell-only precache variant.
export const PRECACHE_EXCLUDE = [
  "js/soundpack.js",
];


export function stage(outDir) {
  const out = path.resolve(ROOT, outDir);
  execFileSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"],
    { cwd: ROOT, stdio: "inherit" });
  // Last, so it sees the finished artifact — the precache list is written from
  // what is actually about to deploy, not from what anyone believes is.
  injectPrecache(out, { exclude: PRECACHE_EXCLUDE });
  return { outDir: out };
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const out = process.argv[2];
  if (!out) { console.error("usage: node tools/stage.mjs <outDir>"); process.exit(1); }
  stage(out);
}
