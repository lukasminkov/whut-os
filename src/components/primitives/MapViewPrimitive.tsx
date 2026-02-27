"use client";

import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import type { MapViewData } from "@/lib/scene-v4-types";

function buildStaticMapUrl(data: MapViewData): string {
  const center = data.center || (data.pins.length > 0
    ? { lat: data.pins.reduce((s, p) => s + p.lat, 0) / data.pins.length, lng: data.pins.reduce((s, p) => s + p.lng, 0) / data.pins.length }
    : { lat: 25.76, lng: -80.19 });
  const zoom = data.zoom || (data.pins.length > 1 ? 12 : 14);

  // Use OpenStreetMap static tiles via a free service
  const markers = data.pins.map((p, i) => `${p.lat},${p.lng}`).join("|");
  
  // Google Maps embed URL (works without API key for basic embeds)
  const q = data.pins.length === 1
    ? `${data.pins[0].lat},${data.pins[0].lng}`
    : data.pins.map(p => `${p.lat},${p.lng}`).join("/");
  
  return `https://www.google.com/maps/embed/v1/view?key=&center=${center.lat},${center.lng}&zoom=${zoom}&maptype=roadmap`;
}

function buildGoogleMapsLink(data: MapViewData): string {
  if (data.pins.length === 1) {
    const p = data.pins[0];
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  // Multiple pins — use directions or search
  const p = data.pins[0];
  return `https://www.google.com/maps/@${p.lat},${p.lng},${data.zoom || 12}z`;
}

export default function MapViewPrimitive({ data }: { data: MapViewData }) {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);

  // Calculate bounding box for pin positions
  const center = data.center || (data.pins.length > 0
    ? { lat: data.pins.reduce((s, p) => s + p.lat, 0) / data.pins.length, lng: data.pins.reduce((s, p) => s + p.lng, 0) / data.pins.length }
    : { lat: 0, lng: 0 });

  // Simple visual map with pins plotted (no external dependency)
  const latRange = data.pins.length > 1 ? Math.max(0.01, ...data.pins.map(p => Math.abs(p.lat - center.lat))) * 2.5 : 0.02;
  const lngRange = data.pins.length > 1 ? Math.max(0.01, ...data.pins.map(p => Math.abs(p.lng - center.lng))) * 2.5 : 0.02;

  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]">
      {data.title && (
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-medium text-white/70">{data.title}</span>
          <a
            href={buildGoogleMapsLink(data)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#00d4aa]/70 hover:text-[#00d4aa] flex items-center gap-1 transition"
          >
            Open in Maps <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Map visualization */}
      <div className="relative w-full h-[240px] bg-[#0a1a2e] overflow-hidden">
        {/* Grid lines for map feel */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={`h${i}`} className="absolute w-full h-px bg-[#00d4aa]" style={{ top: `${(i + 1) * 12.5}%` }} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <div key={`v${i}`} className="absolute h-full w-px bg-[#00d4aa]" style={{ left: `${(i + 1) * 12.5}%` }} />
          ))}
        </div>

        {/* Pins */}
        {data.pins.map((pin, i) => {
          const x = 50 + ((pin.lng - center.lng) / lngRange) * 80;
          const y = 50 - ((pin.lat - center.lat) / latRange) * 80;
          const clamped = { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
          const isHovered = hoveredPin === i;
          return (
            <div
              key={i}
              className="absolute transform -translate-x-1/2 -translate-y-full z-10 cursor-pointer"
              style={{ left: `${clamped.x}%`, top: `${clamped.y}%` }}
              onMouseEnter={() => setHoveredPin(i)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              {/* Pulse ring */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#00d4aa]/20 animate-ping" />
              {/* Pin */}
              <div className={`relative transition-transform ${isHovered ? "scale-125" : ""}`}>
                <MapPin size={24} className="text-[#00d4aa] fill-[#00d4aa]/30 drop-shadow-lg" />
                {pin.label && (
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap px-2 py-1 rounded-md text-[11px] font-medium transition-opacity ${
                    isHovered ? "opacity-100" : "opacity-70"
                  } bg-black/70 backdrop-blur text-white/90 border border-white/10`}>
                    {pin.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pin count badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-[11px] text-white/60">
          {data.pins.length} location{data.pins.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Pin legend */}
      {data.pins.some(p => p.label) && (
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex flex-wrap gap-3">
          {data.pins.filter(p => p.label).map((pin, i) => (
            <span
              key={i}
              className={`text-[11px] flex items-center gap-1.5 transition ${hoveredPin === i ? "text-[#00d4aa]" : "text-white/40"}`}
              onMouseEnter={() => setHoveredPin(i)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
              {pin.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
