import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../fixtures";

type Textbox = { key: string, parts: string[] };
type Deck = { slides: Record<number, Textbox[]> };
type ShowOptions = { renderDelayMs?: number, prerenderNext?: boolean, updateHash?: boolean };

async function enterAndShow(page: Page, deck: Deck, slide: number, options: ShowOptions = {}): Promise<void> {
  await page.evaluate(async ({ deck, slide, options }) => {
    const mock = (window as unknown as {
      __mock: {
        enterPresent(deck: Deck): Promise<void>
        showSlide(slide: number, options?: ShowOptions): Promise<void>
      }
    }).__mock;
    await mock.enterPresent(deck);
    await mock.showSlide(slide, options);
  }, { deck, slide, options });
}

async function showSlide(page: Page, slide: number, options: ShowOptions = {}): Promise<void> {
  await page.evaluate(async ({ slide, options }) => {
    await (window as unknown as {
      __mock: { showSlide(slide: number, options?: ShowOptions): Promise<void> }
    }).__mock.showSlide(slide, options);
  }, { slide, options });
}

async function recreateDom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await (window as unknown as { __mock: { recreateDom(): Promise<void> } }).__mock.recreateDom();
  });
}

function timer(page: Page, key: string): Locator {
  return page
    .frameLocator('iframe[title="Mock presentation viewport"]')
    .locator(`g[data-mock-textbox="${key}"] > text`)
    .first();
}

function countdownSeconds(value: string | null): number {
  const match = value?.match(/^(\d+):(\d{2})/);
  if (!match) throw new Error(`Not a rendered countdown: ${JSON.stringify(value)}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

async function readCountdown(locator: Locator): Promise<number> {
  return countdownSeconds(await locator.textContent());
}

async function waitForRendered(locator: Locator): Promise<number> {
  await expect.poll(async () => locator.textContent(), { timeout: 2_000 })
    .toMatch(/^0:\d{2}/);
  return readCountdown(locator);
}

const sharedDeck: Deck = {
  slides: {
    1: [{ key: "alex-1", parts: ["<<0:20-|id=alex>>"] }],
    2: [{ key: "alex-2", parts: ["<<0:20-|id=alex>>"] }],
    3: [{ key: "bob-3", parts: ["<<0:20-|id=bob>>"] }]
  }
};

test("autostart-first-visit", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1, { renderDelayMs: 400 });
  const display = timer(page, "alex-1");
  const first = await waitForRendered(display);
  await page.waitForTimeout(1_200);
  const second = await readCountdown(display);

  expect(second, "the first visit must start without navigation").toBeLessThan(first);
});

test("live-update", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1, { renderDelayMs: 400 });
  const display = timer(page, "alex-1");
  await waitForRendered(display);

  const samples: number[] = [];
  for (let index = 0; index < 5; index++) {
    samples.push(await readCountdown(display));
    if (index < 4) await page.waitForTimeout(1_200);
  }

  for (let index = 1; index < samples.length; index++) {
    expect(samples[index], `sample ${index} must decrease: ${samples.join(", ")}`)
      .toBeLessThan(samples[index - 1]);
  }
});

test("continuity", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1);
  const firstSlide = timer(page, "alex-1");
  await waitForRendered(firstSlide);
  await page.waitForTimeout(2_100);
  const beforeNavigation = await readCountdown(firstSlide);

  await showSlide(page, 2);
  const secondSlide = timer(page, "alex-2");
  const afterNavigation = await waitForRendered(secondSlide);
  expect(afterNavigation).toBeLessThanOrEqual(beforeNavigation);
  expect(afterNavigation).toBeGreaterThanOrEqual(beforeNavigation - 2);
  expect(afterNavigation).toBeLessThan(20);

  await page.waitForTimeout(1_200);
  expect(await readCountdown(secondSlide)).toBeLessThan(afterNavigation);
});

test("independence-and-pause", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1);
  const alexSlideOne = timer(page, "alex-1");
  await waitForRendered(alexSlideOne);
  await page.waitForTimeout(2_100);
  const alexAtLeave = await readCountdown(alexSlideOne);

  await showSlide(page, 3);
  const bobSlideThree = timer(page, "bob-3");
  const bobAtStart = await waitForRendered(bobSlideThree);
  expect(bobAtStart).toBeGreaterThanOrEqual(19);
  await page.waitForTimeout(2_100);
  const bobAtLeave = await readCountdown(bobSlideThree);
  expect(bobAtLeave).toBeLessThan(bobAtStart);

  await showSlide(page, 2);
  const alexSlideTwo = timer(page, "alex-2");
  const alexAtReturn = await waitForRendered(alexSlideTwo);
  expect(alexAtReturn).toBeLessThanOrEqual(alexAtLeave);
  expect(alexAtReturn).toBeGreaterThanOrEqual(alexAtLeave - 1);
  await page.waitForTimeout(2_100);
  expect(await readCountdown(alexSlideTwo)).toBeLessThan(alexAtReturn);

  await showSlide(page, 3);
  const bobAtReturn = await waitForRendered(bobSlideThree);
  expect(bobAtReturn).toBeLessThanOrEqual(bobAtLeave);
  expect(bobAtReturn).toBeGreaterThanOrEqual(bobAtLeave - 1);
});

test("wrapped", async ({ page }) => {
  const wrappedDeck: Deck = {
    slides: {
      1: [{ key: "wrapped-two", parts: ["<<0:20-|", "id=alex>>"] }],
      2: [{ key: "wrapped-three", parts: ["<<0:20", "-|id=", "alex>>"] }]
    }
  };
  await enterAndShow(page, wrappedDeck, 1);
  const twoParts = timer(page, "wrapped-two");
  await waitForRendered(twoParts);
  await page.waitForTimeout(1_200);
  const beforeNavigation = await readCountdown(twoParts);
  expect(beforeNavigation).toBeLessThan(20);

  await showSlide(page, 2);
  const threeParts = timer(page, "wrapped-three");
  const afterNavigation = await waitForRendered(threeParts);
  expect(afterNavigation).toBeLessThanOrEqual(beforeNavigation);
  expect(afterNavigation).toBeGreaterThanOrEqual(beforeNavigation - 2);
  await page.waitForTimeout(1_200);
  expect(await readCountdown(threeParts)).toBeLessThan(afterNavigation);
});

test("prerender-attribution", async ({ page }) => {
  const deck: Deck = {
    slides: {
      1: [{ key: "alex-visible", parts: ["<<0:20-|id=alex>>"] }],
      2: [{ key: "bob-hidden", parts: ["<<0:20-|id=bob>>"] }]
    }
  };
  await enterAndShow(page, deck, 1, { prerenderNext: true });
  const alex = timer(page, "alex-visible");
  await waitForRendered(alex);
  await page.waitForTimeout(2_200);
  expect(await readCountdown(alex)).toBeLessThan(20);

  await showSlide(page, 2);
  const bob = timer(page, "bob-hidden");
  const bobAtStart = await waitForRendered(bob);
  expect(bobAtStart, "hidden prerender must not consume Bob's budget").toBeGreaterThanOrEqual(19);
  await page.waitForTimeout(1_200);
  expect(await readCountdown(bob)).toBeLessThan(bobAtStart);
});

test("dom-recreation", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1);
  const beforeFrame = timer(page, "alex-1");
  await waitForRendered(beforeFrame);
  await page.waitForTimeout(2_100);
  const beforeRecreation = await readCountdown(beforeFrame);

  await recreateDom(page);
  const afterFrame = timer(page, "alex-1");
  const afterRecreation = await waitForRendered(afterFrame);
  expect(afterRecreation).toBeLessThanOrEqual(beforeRecreation);
  expect(afterRecreation).toBeGreaterThanOrEqual(beforeRecreation - 2);
  expect(afterRecreation).toBeLessThan(20);
  await page.waitForTimeout(1_200);
  expect(await readCountdown(afterFrame)).toBeLessThan(afterRecreation);
});

test("hashless-navigation", async ({ page }) => {
  await enterAndShow(page, sharedDeck, 1, { renderDelayMs: 400, updateHash: false });
  const firstSlide = timer(page, "alex-1");
  await waitForRendered(firstSlide);
  await page.waitForTimeout(2_100);
  const beforeNavigation = await readCountdown(firstSlide);

  await showSlide(page, 2, { updateHash: false });
  const secondSlide = timer(page, "alex-2");
  const afterNavigation = await waitForRendered(secondSlide);
  expect(afterNavigation).toBeLessThanOrEqual(beforeNavigation);
  expect(afterNavigation).toBeGreaterThanOrEqual(beforeNavigation - 2);
  expect(afterNavigation).toBeLessThan(20);
  await page.waitForTimeout(1_200);
  expect(await readCountdown(secondSlide)).toBeLessThan(afterNavigation);
});
