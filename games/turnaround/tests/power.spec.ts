import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";

declare global {
  interface Window {
    rampAudio: AudioContext[];
    rampPower: {
      frames: number;
      draws: number;
      raf: number;
      timers: number;
      cpu: number;
      mutations: number;
    };
  }
}
const baseline = process.env.POWER_BASELINE === "1";
async function instrument(page: Page) {
  await page.addInitScript(() => {
    window.rampAudio = [];
    const Audio = window.AudioContext;
    window.AudioContext = class extends Audio {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.rampAudio.push(this);
      }
    };
    const counters = (window.rampPower = {
      frames: 0,
      draws: 0,
      raf: 0,
      timers: 0,
      cpu: 0,
      mutations: 0,
    });
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      raf((at) => {
        const start = performance.now(),
          before = counters.draws;
        counters.raf++;
        callback(at);
        counters.cpu += performance.now() - start;
        if (counters.draws > before) counters.frames++;
      });
    for (const name of ["setInterval", "setTimeout"] as const) {
      const schedule = window[name];
      window[name] = ((
        callback: TimerHandler,
        delay?: number,
        ...args: unknown[]
      ) =>
        schedule(
          typeof callback === "function"
            ? (...values: unknown[]) => {
                const start = performance.now();
                counters.timers++;
                try {
                  callback(...values);
                } finally {
                  counters.cpu += performance.now() - start;
                }
              }
            : callback,
          delay,
          ...args,
        )) as typeof window.setTimeout;
    }
    for (const prototype of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype,
    ]) {
      const methods = prototype as unknown as Record<
        string,
        (...args: number[]) => void
      >;
      for (const method of [
        "drawArrays",
        "drawElements",
        "drawArraysInstanced",
        "drawElementsInstanced",
      ] as const) {
        const original = methods[method];
        if (original)
          methods[method] = function (...args: number[]) {
            counters.draws++;
            return original.apply(this, args);
          };
      }
    }
    new MutationObserver((records) => {
      counters.mutations += records.length;
    }).observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    });
  });
}
async function sample(page: Page, name: string, ms = 5000) {
  const snapshot = () =>
    page.evaluate(() => ({
      ...window.rampPower,
      at: performance.now(),
      clock: document.querySelector("#clock")?.textContent,
    }));
  const before = await snapshot();
  await page.waitForTimeout(ms);
  const after = await snapshot(),
    seconds = (after.at - before.at) / 1000;
  const frames = after.frames - before.frames,
    draws = after.draws - before.draws;
  return {
    name,
    seconds,
    frames,
    draws,
    renderedFps: frames / seconds,
    drawsPerFrame: draws / Math.max(1, frames),
    rafCallbacks: after.raf - before.raf,
    timerCallbacks: after.timers - before.timers,
    callbackCpuMs: after.cpu - before.cpu,
    callbackCpuMsPerSecond: (after.cpu - before.cpu) / seconds,
    domMutations: after.mutations - before.mutations,
    clockBefore: before.clock,
    clockAfter: after.clock,
  };
}
async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
async function dock(page: Page, id: string, height = 0) {
  await page.locator(`[data-vehicle="${id}"]`).click();
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
  await hold(page, "Space", 1000);
  for (
    let i = 0;
    i < 12 &&
    !(await page.locator("#context-detail").innerText()).includes("ALIGNED");
    i++
  ) {
    await hold(page, "w", 220);
    await hold(page, "Space", 1000);
  }
  await expect(page.locator("#context-detail")).toContainText("ALIGNED");
  await page.keyboard.press("f");
}
async function save(
  page: Page,
  name: string,
  samples: Awaited<ReturnType<typeof sample>>[],
) {
  const label = baseline ? "before" : (process.env.POWER_REPORT_LABEL ?? "after");
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Invalid power report label");
  await mkdir("docs/power", { recursive: true });
  const host = {
    cpu: os.cpus()[0].model,
    memory: os.totalmem(),
    platform: os.platform(),
    release: os.release(),
  };
  const browser = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
  }));
  await writeFile(
    `docs/power/${label}-${name}.json`,
    JSON.stringify(
      {
        host,
        browser,
        scenario:
          "Local development build with real UI controls; no CPU/network throttling. Callback CPU excludes layout, asynchronous browser/GPU work and unwrapped callbacks. Not a wattmeter.",
        samples,
      },
      null,
      2,
    ) + "\n",
  );
}
test("flight, menu and background energy workload", async ({ page }) => {
  await instrument(page);
  await page.goto("./?lang=en&flight=1");
  await expect(
    page.getByRole("button", { name: "Start shift ↗", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(2000);
  const samples = [await sample(page, "menu", 3000)];
  await page
    .getByRole("button", { name: "Start shift ↗", exact: true })
    .click();
  await expect(page.locator("#phase")).toBeVisible();
  await page.waitForTimeout(1000);
  samples.push(await sample(page, "approach"));
  if (!baseline)
    await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await expect(page.locator(".game-fps")).toHaveText("0 FPS");
  samples.push(await sample(page, "paused", 3000));
  expect(samples.at(-1)!.frames).toBe(0);
  if (!baseline) expect(samples.at(-1)!.timerCallbacks).toBe(0);
  if (!baseline)
    expect(
      await page.evaluate(() =>
        window.rampAudio.map((context) => context.state),
      ),
    ).toEqual(["suspended"]);
  if (!baseline) {
    await page
      .getByRole("button", { name: "Resume shift →", exact: true })
      .click();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    samples.push(await sample(page, "hidden", 3000));
    expect(samples.at(-1)!.frames).toBe(0);
    expect(samples.at(-1)!.timerCallbacks).toBe(0);
    expect(samples.at(-1)!.clockBefore).toBe(samples.at(-1)!.clockAfter);
    expect(
      await page.evaluate(() =>
        window.rampAudio.map((context) => context.state),
      ),
    ).toEqual(["suspended"]);
  }
  await save(page, "flight", samples);
});
test("wet ramp, stationary refuelling and parallel services energy workload", async ({
  page,
}, info) => {
  await instrument(page);
  await page.goto("./?lang=en&flight=2&qa=service");
  await page
    .getByRole("button", { name: "Start shift ↗", exact: true })
    .click();
  await expect(page.locator("#phase")).toBeVisible();
  await page.waitForTimeout(2000);
  const samples = [await sample(page, "settled-ramp", 3000)];
  await hold(page, "w", 1700);
  await hold(page, "Space", 1000);
  const securedAt = Date.now();
  await page.keyboard.press("f");
  await expect(page.locator('[data-task="secure"]')).toHaveAttribute(
    "data-status",
    "done",
  );
  if (!baseline) expect(Date.now() - securedAt).toBeLessThan(3600);
  await dock(page, "fuel");
  await page.waitForTimeout(2000);
  samples.push(await sample(page, "refuelling-only"));
  await expect(page.locator('[data-task="fuel"]')).toHaveAttribute(
    "data-status",
    "running",
  );
  expect(samples.at(-1)!.clockBefore).not.toBe(samples.at(-1)!.clockAfter);
  if (!baseline) expect(samples.at(-1)!.frames).toBe(0);
  await dock(page, "stairs", 1.3);
  await dock(page, "belt", 1);
  await expect(page.locator('[data-task="unload"]')).toHaveAttribute(
    "data-status",
    "running",
  );
  samples.push(await sample(page, "parallel-services"));
  expect(samples.at(-1)!.renderedFps).toBeGreaterThan(45);
  await page.screenshot({ path: info.outputPath("parallel-services.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await expect(page.locator(".game-fps")).toHaveText("0 FPS");
  samples.push(await sample(page, "paused-services", 3000));
  expect(samples.at(-1)!.clockBefore).toBe(samples.at(-1)!.clockAfter);
  await page
    .getByRole("button", { name: "Resume shift →", exact: true })
    .click();
  await expect(page.locator('[data-task="unload"]')).toHaveAttribute(
    "data-status",
    "done",
    { timeout: 45_000 },
  );
  await expect(page.locator('[data-task="fuel"]')).toHaveAttribute(
    "data-status",
    "done",
  );
  await page.waitForTimeout(2000);
  samples.push(await sample(page, "services-finished", 3000));
  expect(samples.at(-1)!.frames).toBe(0);
  await save(page, "ramp", samples);
});
