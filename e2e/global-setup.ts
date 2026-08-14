import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");

export default function globalSetup(): void {
  const normalBuild = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8"
  });
  if (normalBuild.status === 0) {
    process.stdout.write(normalBuild.stdout);
    process.stderr.write(normalBuild.stderr);
    return;
  }

  const normalOutput = `${normalBuild.stdout}${normalBuild.stderr}`;
  if (!normalOutput.includes("Operation not permitted")) {
    process.stdout.write(normalBuild.stdout);
    process.stderr.write(normalBuild.stderr);
    throw new Error(`Production extension build failed with exit code ${normalBuild.status}`);
  }

  process.stdout.write("Plasmo LMDB cache unavailable; retrying with Parcel filesystem cache.\n");
  const cacheShim = path.join(__dirname, "parcel-fs-cache.cjs");
  const fallbackBuild = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${cacheShim}`.trim()
    },
    encoding: "utf8"
  });
  process.stdout.write(fallbackBuild.stdout);
  process.stderr.write(fallbackBuild.stderr);
  if (fallbackBuild.status !== 0) {
    throw new Error(`Production extension build failed with exit code ${fallbackBuild.status}`);
  }
}
