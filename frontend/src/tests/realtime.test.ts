import { describe, it, expect, beforeEach } from "vitest";
import { realtimeBus } from "@/lib/realtimeBus";
import { updateHospitalAvailability, fetchHospitalById } from "@/shared/services/hospitalService";

describe("realtime bus + availability mutation", () => {
  beforeEach(() => {
    // No teardown — bus is shared module-level (matches production behavior).
  });

  it("emits an event when availability is updated", async () => {
    const events: Array<{ id: string; icu: number }> = [];
    const unsub = realtimeBus.subscribe((e) => {
      events.push({ id: e.hospital.id, icu: e.hospital.beds.icu.available });
    });

    const before = await fetchHospitalById("h-kem");
    expect(before).not.toBeNull();

    await updateHospitalAvailability("h-kem", {
      icu: { total: before!.beds.icu.total, available: 0 },
      general: before!.beds.general,
      ventilators: before!.beds.ventilators,
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1)).toEqual({ id: "h-kem", icu: 0 });
    unsub();
  });
});
