import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { mkdtempSync } from "node:fs";

const e2eDir = __dirname;
const repoRoot = path.resolve(e2eDir, "..");
const extensionPath = path.join(repoRoot, "build", "chrome-mv3-prod");
const mockHtml = readFileSync(path.join(e2eDir, "mock", "slides.html"), "utf8");
const mockUrl = "https://docs.google.com/presentation/d/slidetime-e2e/present";

function executableCandidates(): Array<string | undefined> {
  const candidates: Array<string | undefined> = [];
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    candidates.push(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
  }

  const bundled = chromium.executablePath();
  if (existsSync(bundled)) candidates.push(bundled);

  const cacheRoot = path.join(process.env.HOME ?? "", "Library", "Caches", "ms-playwright");
  if (existsSync(cacheRoot)) {
    const cached = readdirSync(cacheRoot)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const directory of cached) {
      for (const binary of [
        path.join(cacheRoot, directory, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
        path.join(cacheRoot, directory, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium")
      ]) {
        if (existsSync(binary)) candidates.push(binary);
      }
    }

    const headlessShells = readdirSync(cacheRoot)
      .filter((name) => /^chromium_headless_shell-\d+$/.test(name))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const directory of headlessShells) {
      const binary = path.join(cacheRoot, directory, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
      if (existsSync(binary)) candidates.push(binary);
    }
  }

  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(systemChrome)) candidates.push(systemChrome);
  return [...new Set(candidates)];
}

async function launchExtensionContext(): Promise<{ context: BrowserContext, profileDirs: string[] }> {
  const failures: string[] = [];
  const profileDirs: string[] = [];

  for (const executablePath of executableCandidates()) {
    const modes = executablePath?.includes("chrome-headless-shell") ? [true] : [true, false];
    for (const headless of modes) {
      const userDataDir = mkdtempSync(path.join("/tmp", "slidetime-e2e-profile-"));
      profileDirs.push(userDataDir);
      try {
        const context = await chromium.launchPersistentContext(userDataDir, {
          executablePath,
          headless,
          args: [
            "--disable-crash-reporter",
            "--disable-crashpad",
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
          ]
        });

        const worker = context.serviceWorkers().find((item) => item.url().startsWith("chrome-extension://")) ??
          await context.waitForEvent("serviceworker", { timeout: 4_000 }).catch(() => null);
        if (worker) return { context, profileDirs };

        failures.push(`${executablePath} (${headless ? "headless" : "headed"}): extension service worker did not load`);
        await context.close();
      } catch (error) {
        const summary = String(error).split("\n", 1)[0];
        failures.push(`${executablePath} (${headless ? "headless" : "headed"}): ${summary}`);
      }
    }
  }

  for (const profileDir of profileDirs) rmSync(profileDir, { recursive: true, force: true });
  throw new Error(`Could not launch Chromium with the built extension:\n${failures.join("\n")}`);
}

type TestFixtures = {
  page: Page
};

type WorkerFixtures = {
  extensionContext: BrowserContext
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  extensionContext: [async ({}, use) => {
    const launched = await launchExtensionContext();
    await launched.context.route("https://docs.google.com/presentation/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: mockHtml });
    });
    await use(launched.context);
    await launched.context.close();
    for (const profileDir of launched.profileDirs) {
      rmSync(profileDir, { recursive: true, force: true });
    }
  }, { scope: "worker" }],

  page: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(mockUrl);
    await page.waitForFunction(() => typeof (window as Window & { __mock?: unknown }).__mock === "object");
    await use(page);
    await page.close();
  }
});

export { expect } from "@playwright/test";
