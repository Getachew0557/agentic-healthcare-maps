import type { Hospital } from "@/shared/types";

/**
 * Tiny in-memory pub/sub that stands in for a WebSocket during the demo.
 * `useRealtimeAvailability` subscribes and patches the TanStack Query cache
 * so the map and triage results refresh without a refetch.
 */
export type AvailabilityEvent = {
  type: "availability.updated";
  hospital: Hospital;
  at: number;
};

type Listener = (e: AvailabilityEvent) => void;

const listeners = new Set<Listener>();

export const realtimeBus = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(e: AvailabilityEvent) {
    for (const fn of listeners) fn(e);
  },
};
