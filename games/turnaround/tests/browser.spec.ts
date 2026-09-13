import { test, expect, type Page } from "@playwright/test";

test("shared appearance stays usable across menu, flight, pause and localization", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./?lang=en&theme=dark&accent=violet&qa=service");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Start shift ↗", exact: true })).toBeVisible();
  await expect(page.locator("#appearance")).toHaveCount(1);
  await expect(dialog.locator("#appearance")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Alena Martinková" })).toHaveAttribute("href", "/");
  await page.screenshot({ path: info.outputPath("menu-dark.png") });
  const primary = page.locator(".ta-primary");
  const violet = await primary.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Accent color", exact: true }).click();
  await page.getByRole("button", { name: "Cyan", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "cyan");
  expect(await primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(violet);
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-colors")).toBeHidden();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Prepnúť do slovenčiny", exact: true }).click();
  await expect(dialog.getByRole("link", { name: "Alena Martinková" })).toHaveAttribute("href", "/sk/");
  await expect(dialog.locator("[data-site-games]")).toHaveAttribute("href", "/games/?lang=sk");
  await expect(dialog.locator("#appearance")).toBeVisible();
  await page.reload();
  await expect(dialog.locator("#appearance")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "sk");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "cyan");
  await page.getByRole("link", { name: "Switch to English", exact: true }).click();
  await page.getByRole("button", { name: "Accent color", exact: true }).click();
  await page.getByRole("button", { name: "Violet", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: info.outputPath("menu-light.png") });
  await page.getByRole("button", { name: "Start shift ↗", exact: true }).click();
  await expect(page.locator("#phase")).toBeVisible();
  await expect(page.locator("header #appearance")).toBeVisible();
  await expect(page.locator(".ta-interact span")).toHaveText("interact / disconnect");
  await page.screenshot({ path: info.outputPath("ramp-light.png") });
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await page.screenshot({ path: info.outputPath("ramp-dark.png") });
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await page.getByRole("button", { name: "Accent color", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your flight can wait." })).toBeVisible();
  await expect(page.locator("#game-colors")).toBeHidden();
  await expect(page.locator(".game-fps")).toHaveText("0 FPS");
  await page.getByRole("button", { name: "Resume shift →", exact: true }).click();
  await expect(page.locator("header #appearance")).toBeVisible();
  await expect(page.locator("#appearance")).toHaveCount(1);
  await expect(page.locator("#game-colors")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("touch notice shares navigation and appearance without loading a renderer", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 380, height: 820 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", request => requests.push(request.url()));
    await page.goto("http://127.0.0.1:4182/turnaround/?lang=en&theme=dark");
    await expect(page.locator(".ta-desktop h1")).toBeVisible();
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
    await page.getByRole("link", { name: "Prepnúť do slovenčiny", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "sk");
    await expect(page.getByRole("link", { name: "Alena Martinková" })).toHaveAttribute("href", "/sk/");
    await page.getByRole("button", { name: "Farba stránky", exact: true }).click();
    await page.getByRole("button", { name: "Modrá", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
    await page.keyboard.press("Escape");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(requests.filter(url => /babylon|havok|\.wasm|\/world\.ts/i.test(url))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(380);
    await page.screenshot({ path: info.outputPath("touch-light-sk.png") });
  } finally {
    await context.close();
  }
});

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
async function brake(page: Page) {
  await hold(page, "Space", 1000);
}
test("A/D walk screen-left/right and steer the baggage tractor from its nose", async ({ page }, info) => {
  const position = async () => ({
    x: Number(await page.locator("#map-player").getAttribute("cx")),
    z: Number(await page.locator("#map-player").getAttribute("cy")),
  });
  for (const direction of [-1, 1]) {
    await page.goto("./?lang=en&qa=service&theme=light");
    await page.getByRole("button", { name: "Start shift ↗", exact: true }).click();
    await expect(page.locator("#phase")).toBeVisible();
    const start = await position();
    await hold(page, direction < 0 ? "a" : "d", 800);
    await brake(page);
    const walked = await position();
    expect((-(walked.x - start.x) * 52 + (walked.z - start.z) * 40) * direction).toBeGreaterThan(30);
    await page.locator('[data-vehicle="tug"]').click();
    const before = await position();
    await page.keyboard.down("w");
    await hold(page, direction < 0 ? "a" : "d", 1200);
    await page.keyboard.up("w");
    await brake(page);
    expect(((await position()).x - before.x) * direction).toBeLessThan(-0.2);
  }
  await page.screenshot({ path: info.outputPath("baggage-train-turn.png") });
});
test("baggage train steers its front axles through a bend and reverse, then sleeps", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./?lang=en&qa=service&theme=light&flight=2");
  await page.getByRole("button", { name: "Start shift ↗", exact: true }).click();
  await expect(page.locator("#phase")).toBeVisible();
  await page.locator('[data-vehicle="tug"]').click();
  await page.keyboard.down("w");
  await page.waitForTimeout(2500);
  await hold(page, "d", 2000);
  await page.keyboard.up("w");
  await brake(page);
  await page.screenshot({ path: info.outputPath("train-right-turn.png") });
  await page.keyboard.down("s");
  await hold(page, "a", 1800);
  await page.keyboard.up("s");
  await brake(page);
  await page.screenshot({ path: info.outputPath("train-reversing.png") });
  await hold(page, "w", 4000);
  await brake(page);
  await expect(page.locator(".game-fps")).toHaveText("0 FPS");
  await page.screenshot({ path: info.outputPath("train-stopped.png") });
  expect(errors).toEqual([]);
});

async function driveToDock(page: Page, vehicle: string, height = 0) {
  await page.locator(`[data-vehicle="${vehicle}"]`).click();
  if (height) await hold(page, "e", (height * 1000) / 0.7);
  const distance = async () =>
    Number(
      (await page.locator("#dock-stats > span").first().innerText()).match(
        /[\d.]+/,
      )![0],
    );
  await page.keyboard.down("w");
  await expect
    .poll(distance, { timeout: 20_000, intervals: [80] })
    .toBeLessThan(2);
  await page.keyboard.up("w");
  await brake(page);
  for (
    let i = 0;
    i < 12 &&
    !(await page.locator("#context-detail").innerText()).includes("ALIGNED");
    i++
  ) {
    await hold(page, "w", 220);
    await brake(page);
  }
  await expect(page.locator("#context-detail")).toContainText("ALIGNED");
  await page.keyboard.press("f");
}
test("manual approach arrows match the visible chase camera", async ({ page }, info) => {
  await page.goto("./?lang=en&theme=light");
  await page.getByRole("checkbox", { name: "Auto-land", exact: true }).uncheck();
  await page.getByRole("button", { name: "Start shift ↗", exact: true }).click();
  await expect(page.locator("#phase")).toBeVisible();
  const x = async () => Number((await page.locator("#map-plane").getAttribute("transform"))!.match(/translate\(([-\d.]+)/)![1]);
  const before = await x();
  await hold(page, "ArrowRight", 950);
  const right = await x();
  expect(right).toBeLessThan(before - 0.5);
  await page.screenshot({ path: info.outputPath("manual-right-bank.png") });
  await hold(page, "ArrowLeft", 1400);
  expect(await x()).toBeGreaterThan(right + 0.5);
});
for (const flight of [1, 2])
  test(`flight ${flight}: keyboard driving, real docks, parallel work, pause and localization`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    if (flight === 2) await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // The development-only service start exercises the real scene/controllers; it never saves scores.
    await page.goto(`./?flight=${flight}&lang=en&qa=service&theme=light`);
    await page
      .getByRole("button", { name: "Start shift ↗", exact: true })
      .click();
    await expect(page.locator("#phase")).toHaveText("03 / Turnaround");
    await expect(page.locator("#phase")).toBeVisible();
    await hold(page, "w", 1700);
    await brake(page);
    await page.keyboard.press("f");
    await expect(page.locator('[data-task="secure"]')).toHaveAttribute(
      "data-status",
      "done",
    );
    await driveToDock(page, "stairs", 1.3);
    await expect(page.locator('[data-task="deplane"]')).toHaveAttribute(
      "data-status",
      "running",
    );
    await driveToDock(page, "belt", 1);
    await expect(page.locator('[data-task="unload"]')).toHaveAttribute(
      "data-status",
      "running",
    );
    if (flight === 2) {
      await driveToDock(page, "fuel");
      await expect(page.locator('[data-task="fuel"]')).toHaveAttribute(
        "data-status",
        "running",
      );
      await expect(page.locator('[data-task="unload"]')).toHaveAttribute(
        "data-status",
        "running",
      );
    }
    await page.screenshot({
      path: info.outputPath(`flight-${flight}-service.png`),
    });
    await page.keyboard.press("Escape");
    const elapsed = await page.locator("#clock").innerText();
    await expect(
      page.getByRole("heading", { name: "Your flight can wait." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Prepnúť do slovenčiny", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "sk");
    await expect(
      page.getByRole("heading", { name: "Tvoj let počká." }),
    ).toBeVisible();
    await page.waitForTimeout(1400);
    await expect(page.locator("#clock")).toHaveText(elapsed);
    await expect(page.locator(".game-fps")).toHaveText("0 FPS");
    await page
      .getByRole("button", { name: "Pokračovať →", exact: true })
      .click();
    await expect(page.locator("#phase")).toHaveText("03 / Obsluha");
    await expect(page.locator(".game-fps")).not.toHaveText("0 FPS");
    expect(errors).toEqual([]);
  });
