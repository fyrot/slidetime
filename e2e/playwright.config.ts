import { defineConfig } from "@playwright/test";
import path from "node:path";

const e2eDir = __dirname;

export default defineConfig({
  testDir: path.join(e2eDir, "tests"),
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  globalSetup: path.join(e2eDir, "global-setup.ts"),
  reporter: "list"
});
