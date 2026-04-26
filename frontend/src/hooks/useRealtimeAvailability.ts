import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeBus } from "@/lib/realtimeBus";
import type { Hospital } from "@/shared/types";

/**
 * Subscribes to the realtime bus and patches cached `["hospitals"]` data
 * in place so the map markers and triage results refresh instantly.
 */
export function useRealtimeAvailability() {
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = realtimeBus.subscribe((e) => {
      if (e.type !== "availability.updated") return;
      qc.setQueryData<Hospital[]>(["hospitals"], (prev) =>
        prev ? prev.map((h) => (h.id === e.hospital.id ? { ...h, ...e.hospital } : h)) : prev,
      );
      qc.setQueryData<Hospital | null>(["hospital", e.hospital.id], (prev) =>
        prev ? { ...prev, ...e.hospital } : prev,
      );
    });
    return () => {
      unsub();
    };
  }, [qc]);
}
