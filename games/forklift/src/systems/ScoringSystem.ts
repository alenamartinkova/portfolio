export interface RunStats {
  seconds: number;
  integrity: number;
  propertyDamage: number;
  collisions: number;
  delivered: boolean;
}
export function scoreRun(s: RunStats) {
  const time = Math.max(1000, Math.round(10000 - s.seconds * 40));
  const cargo = Math.round((100 - s.integrity) * 65);
  const property = Math.round(s.propertyDamage);
  const style = s.collisions === 0 && s.integrity >= 95 ? 1500 : 0;
  const total = s.delivered ? Math.max(0, time - cargo - property + style) : 0;
  return {
    time,
    cargo,
    property,
    style,
    total,
    grade:
      total >= 8500 ? "S" : total >= 6500 ? "A" : total >= 4000 ? "B" : "C",
  };
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
