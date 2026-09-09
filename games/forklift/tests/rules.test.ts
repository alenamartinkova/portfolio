import { describe, expect, it } from "vitest";
import { scoreRun, formatTime } from "../src/systems/ScoringSystem";
import { deliveryEligible } from "../src/systems/MissionManager";
describe("scoring", () => {
  const run = {
    seconds: 90,
    integrity: 100,
    propertyDamage: 0,
    collisions: 0,
    delivered: true,
  };
  it("rewards fast clean deliveries", () => {
    expect(scoreRun(run).total).toBe(7900);
    expect(scoreRun({ ...run, seconds: 60 }).total).toBeGreaterThan(
      scoreRun(run).total,
    );
  });
  it("penalizes cargo damage, warehouse damage, and losing the clean run bonus", () => {
    expect(
      scoreRun({ ...run, integrity: 80, propertyDamage: 400, collisions: 1 })
        .total,
    ).toBe(4700);
  });
  it("never awards points to an incomplete delivery", () => {
    expect(scoreRun({ ...run, delivered: false }).total).toBe(0);
  });
  it("clamps very damaged slow runs at zero", () => {
    expect(
      scoreRun({ ...run, seconds: 900, integrity: 0, propertyDamage: 10000 })
        .total,
    ).toBe(0);
  });
  it("formats the timer", () => {
    expect(formatTime(125.9)).toBe("02:05");
  });
});
describe("delivery rules", () => {
  const pos = { x: 8, y: 0.02, z: 15 };
  it("accepts a settled upright piano with forks withdrawn", () => {
    expect(deliveryEligible(pos, 0, 1, true)).toBe(true);
  });
  it("rejects cargo held in the air or still on the forks", () => {
    expect(deliveryEligible({ ...pos, y: 0.6 }, 0, 1, true)).toBe(false);
    expect(deliveryEligible(pos, 0, 1, false)).toBe(false);
  });
  it("requires the complete cargo footprint inside the zone", () => {
    expect(deliveryEligible({ ...pos, x: 10.5 }, 0, 1, true)).toBe(false);
    expect(deliveryEligible({ ...pos, z: 17 }, 0, 1, true)).toBe(false);
  });
  it("rejects cargo thrown through the bay or lying on its side", () => {
    expect(deliveryEligible(pos, 2, 1, true)).toBe(false);
    expect(deliveryEligible(pos, 0, 0.3, true)).toBe(false);
  });
});
