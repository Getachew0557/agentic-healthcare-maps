import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Hospital } from "@/shared/types";
import { bedStatusOf } from "@/shared/components/Badges";

const COLORS = {
  available: "oklch(0.62 0.16 155)",
  low: "oklch(0.78 0.16 75)",
  full: "oklch(0.58 0.22 25)",
  unknown: "oklch(0.6 0.02 250)",
} as const;

function makeIcon(color: string, pulse = false) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="position:relative;width:28px;height:28px;">
      ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.35;animation:pulse-ring 1.8s infinite"></span>` : ""}
      <span style="position:absolute;inset:4px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px white, 0 6px 16px -6px rgba(0,0,0,.4)"></span>
    </div>`,
  });
}

interface Props {
  hospitals: Hospital[];
  selectedId?: string | null;
  onSelect?: (h: Hospital) => void;
}

export function HospitalMap({ hospitals, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([19.05, 72.88], 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    mapRef.current = map;
    setReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    hospitals.forEach((h) => {
      const status = bedStatusOf(h);
      const marker = L.marker([h.lat, h.lng], { icon: makeIcon(COLORS[status], status === "full") }).addTo(map);
      const popup = `
        <div style="padding:14px 16px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${COLORS[status]};">
            ${status === "available" ? "Beds available" : status === "low" ? "Low availability" : status === "full" ? "No beds" : "Unknown"}
          </div>
          <div style="font-size:15px;font-weight:600;margin-top:4px;">${h.name}</div>
          <div style="font-size:12px;color:#64748b;">${h.address}, ${h.city}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;font-size:12px;">
            <div style="background:#f1f5f9;padding:6px;border-radius:6px;text-align:center;"><b>${h.beds.icu.available}</b><br/><span style="color:#64748b">ICU</span></div>
            <div style="background:#f1f5f9;padding:6px;border-radius:6px;text-align:center;"><b>${h.beds.general.available}</b><br/><span style="color:#64748b">General</span></div>
            <div style="background:#f1f5f9;padding:6px;border-radius:6px;text-align:center;"><b>${h.beds.ventilators.available}</b><br/><span style="color:#64748b">Vent</span></div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#475569;">
            <div>${h.specialties.slice(0, 3).join(" • ")}</div>
            <div style="margin-top:4px;">📞 ${h.phone}</div>
            <div>🚗 ${h.travelTimeMin ?? "—"} min away</div>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;">
            <a href="/hospitals/${h.id}" style="flex:1;text-align:center;background:oklch(0.52 0.18 245);color:white;padding:7px;border-radius:6px;font-size:12px;font-weight:500;text-decoration:none;">Details</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}" target="_blank" rel="noopener" style="flex:1;text-align:center;border:1px solid #e2e8f0;padding:7px;border-radius:6px;font-size:12px;font-weight:500;text-decoration:none;color:#0f172a;">Directions</a>
          </div>
        </div>`;
      marker.bindPopup(popup, { closeButton: true, maxWidth: 300 });
      marker.on("click", () => onSelect?.(h));
      markersRef.current[h.id] = marker;
    });

    if (hospitals.length) {
      const bounds = L.latLngBounds(hospitals.map((h) => [h.lat, h.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [hospitals, ready, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const m = markersRef.current[selectedId];
    if (m) {
      mapRef.current.flyTo(m.getLatLng(), 14, { duration: 0.7 });
      m.openPopup();
    }
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
