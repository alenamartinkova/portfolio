import {
  bestRecord,
  recordKey,
  type FlightState,
  type RecordEntry,
} from "./core/operations";
export class Progress {
  private records: Record<string, RecordEntry> = {};
  constructor(private storage?: Pick<Storage, "getItem" | "setItem">) {
    try {
      const raw: unknown = JSON.parse(
        storage?.getItem("turnaround:records:v1") ?? "{}",
      );
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      for (const [key, value] of Object.entries(raw)) {
        const v = value as RecordEntry | null;
        if (
          !/^[12]:(auto|manual):(auto|manual)$/.test(key) ||
          !v ||
          !Number.isFinite(v.seconds) ||
          v.seconds < 0 ||
          !Array.isArray(v.stars) ||
          v.stars.length !== 4 ||
          !v.stars.every((s) => typeof s === "boolean") ||
          !v.tasks ||
          typeof v.tasks !== "object" ||
          Object.values(v.tasks).some((t) => !Number.isFinite(t) || t < 0)
        )
          continue;
        this.records[key] = v;
      }
    } catch {
      /* A blocked or malformed save keeps session records usable. */
    }
  }
  get(s: FlightState) {
    return this.records[recordKey(s)];
  }
  save(s: FlightState) {
    const key = recordKey(s),
      previous = this.records[key],
      record = bestRecord(previous, s);
    if (!record || record === previous) return false;
    this.records[key] = record;
    try {
      this.storage?.setItem(
        "turnaround:records:v1",
        JSON.stringify(this.records),
      );
    } catch {
      /* Session-only fallback. */
    }
    return true;
  }
}
export function browserStorage() {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}
