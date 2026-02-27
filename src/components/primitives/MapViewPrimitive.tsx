"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import type { MapViewData } from "@/lib/scene-v4-types";

function buildGoogleMapsLink(data: MapViewData): string {
  if (data.pins.length === 1) {
    const p = data.pins[0];
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  const p = data.pins[0];
  return `https://www.google.com/maps/@${p.lat},${p.lng},${data.zoom || 12}z`;
}

function LeafletMap({ data }: { data: MapViewData }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      // Import leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (cancelled || !mapRef.current) return;

      const center = data.center || (data.pins.length > 0
        ? {
            lat: data.pins.reduce((s, p) => s + p.lat, 0) / data.pins.length,
            lng: data.pins.reduce((s, p) => s + p.lng, 0) / data.pins.length,
          }
        : { lat: 25.76, lng: -80.19 });

      const zoom = data.zoom || (data.pins.length > 1 ? 12 : 14);

      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark-themed tiles (CartoDB dark matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Custom pin icon
      const pinIcon = L.divIcon({
        className: "whut-map-pin",
        html: `<div style="
          width: 12px; height: 12px; border-radius: 50%;
          background: #00d4aa; border: 2px solid rgba(0,212,170,0.3);
          box-shadow: 0 0 12px rgba(0,212,170,0.4), 0 0 24px rgba(0,212,170,0.15);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      // Add pins
      data.pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon }).addTo(map);
        if (pin.label) {
          marker.bindTooltip(pin.label, {
            permanent: false,
            className: "whut-map-tooltip",
            direction: "top",
            offset: [0, -8],
          });
        }
      });

      // Fit bounds if multiple pins
      if (data.pins.length > 1) {
        const bounds = L.latLngBounds(data.pins.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }

      // Compact attribution
      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('© <a href="https://carto.com" style="color:rgba(255,255,255,0.3)">CARTO</a>')
        .addTo(map);

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  return <div ref={mapRef} className="w-full h-full" />;
}

export default function MapViewPrimitive({ data }: { data: MapViewData }) {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06]" style={{ background: "rgba(8,12,20,0.5)" }}>
      {data.title && (
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">{data.title}</span>
          <a
            href={buildGoogleMapsLink(data)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#00d4aa]/60 hover:text-[#00d4aa] flex items-center gap-1 transition"
          >
            Open in Maps <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Real map */}
      <div className="relative w-full h-[280px]">
        <LeafletMap data={data} />
        {/* Pin count badge */}
        <div className="absolute bottom-3 right-3 z-[500] px-2.5 py-1 rounded-full text-[11px] text-white/50"
          style={{ background: "rgba(8,12,20,0.7)", backdropFilter: "blur(8px)" }}>
          {data.pins.length} location{data.pins.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Pin legend */}
      {data.pins.some(p => p.label) && (
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex flex-wrap gap-3">
          {data.pins.filter(p => p.label).map((pin, i) => (
            <span
              key={i}
              className={`text-[11px] flex items-center gap-1.5 transition ${hoveredPin === i ? "text-[#00d4aa]" : "text-white/35"}`}
              onMouseEnter={() => setHoveredPin(i)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]/70" />
              {pin.label}
            </span>
          ))}
        </div>
      )}

      {/* Tooltip styles injected globally */}
      <style jsx global>{`
        .whut-map-tooltip {
          background: rgba(8, 12, 20, 0.85) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 212, 170, 0.15) !important;
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: 11px !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
        }
        .whut-map-tooltip::before {
          border-top-color: rgba(0, 212, 170, 0.15) !important;
        }
        .whut-map-pin {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          background: rgba(8, 12, 20, 0.5) !important;
          font-size: 9px !important;
        }
      `}</style>
    </div>
  );
}
