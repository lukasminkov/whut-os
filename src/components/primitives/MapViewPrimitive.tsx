"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, X, ZoomIn, ZoomOut, Locate } from "lucide-react";
import type { MapViewData, MapPin } from "@/lib/scene-v4-types";

function buildGoogleMapsLink(data: MapViewData): string {
  if (data.pins.length === 1) {
    const p = data.pins[0];
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  const p = data.pins[0];
  return `https://www.google.com/maps/@${p.lat},${p.lng},${data.zoom || 12}z`;
}

interface PinPopupData {
  pin: MapPin;
  x: number;
  y: number;
}

function LeafletMap({ data, onPinClick }: { data: MapViewData; onPinClick?: (pin: MapPin) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

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
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
      });

      // Dark-themed tiles (CartoDB dark matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Custom zoom control
      L.control.zoom({ position: "topright" }).addTo(map);

      // Custom pin icon
      const pinIcon = L.divIcon({
        className: "whut-map-pin",
        html: `<div style="
          width: 14px; height: 14px; border-radius: 50%;
          background: #00d4aa; border: 2px solid rgba(0,212,170,0.3);
          box-shadow: 0 0 12px rgba(0,212,170,0.4), 0 0 24px rgba(0,212,170,0.15);
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const activePinIcon = L.divIcon({
        className: "whut-map-pin-active",
        html: `<div style="
          width: 18px; height: 18px; border-radius: 50%;
          background: #00d4aa; border: 3px solid rgba(0,212,170,0.6);
          box-shadow: 0 0 20px rgba(0,212,170,0.6), 0 0 40px rgba(0,212,170,0.3);
          cursor: pointer;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      // Add pins with click handlers
      data.pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon }).addTo(map);
        if (pin.label) {
          marker.bindTooltip(pin.label, {
            permanent: false,
            className: "whut-map-tooltip",
            direction: "top",
            offset: [0, -10],
          });
        }
        marker.on("click", () => {
          // Pulse the clicked pin
          marker.setIcon(activePinIcon);
          setTimeout(() => marker.setIcon(pinIcon), 1500);
          // Smooth zoom to pin
          map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
          onPinClick?.(pin);
        });
        marker.on("mouseover", () => {
          marker.getElement()?.querySelector("div")?.style.setProperty("transform", "scale(1.3)");
        });
        marker.on("mouseout", () => {
          marker.getElement()?.querySelector("div")?.style.setProperty("transform", "scale(1)");
        });
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

      // Expose for external controls
      if (mapRef.current) {
        (mapRef.current as any).__leafletMap = map;
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data, onPinClick]);

  return <div ref={mapRef} className="w-full h-full" />;
}

interface MapViewPrimitiveProps {
  data: MapViewData;
  sendToAI?: (message: string) => void;
}

export default function MapViewPrimitive({ data, sendToAI }: MapViewPrimitiveProps) {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const handlePinClick = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
  }, []);

  const handleDrillDown = useCallback(() => {
    if (selectedPin && sendToAI) {
      sendToAI(`Tell me more about "${selectedPin.label || "this location"}" at coordinates ${selectedPin.lat}, ${selectedPin.lng}`);
    }
    setSelectedPin(null);
  }, [selectedPin, sendToAI]);

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

      {/* Map */}
      <div className="relative w-full h-[320px]">
        <LeafletMap data={data} onPinClick={handlePinClick} />
        
        {/* Pin count badge */}
        <div className="absolute bottom-3 right-3 z-[500] px-2.5 py-1 rounded-full text-[11px] text-white/50"
          style={{ background: "rgba(8,12,20,0.7)", backdropFilter: "blur(8px)" }}>
          {data.pins.length} location{data.pins.length !== 1 ? "s" : ""}
        </div>

        {/* Selected pin popup */}
        <AnimatePresence>
          {selectedPin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-14 left-3 right-3 z-[600] rounded-lg border border-[#00d4aa]/20 p-3"
              style={{ background: "rgba(8,12,20,0.92)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">{selectedPin.label || "Location"}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}
                  </p>
                </div>
                <button onClick={() => setSelectedPin(null)} className="text-white/30 hover:text-white/60 transition">
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {sendToAI && (
                  <button
                    onClick={handleDrillDown}
                    className="text-[10px] px-2.5 py-1 rounded bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25 transition"
                  >
                    Details
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 transition flex items-center gap-1"
                >
                  Google Maps <ExternalLink size={9} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pin legend */}
      {data.pins.some(p => p.label) && (
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex flex-wrap gap-3">
          {data.pins.filter(p => p.label).map((pin, i) => (
            <button
              key={i}
              className={`text-[11px] flex items-center gap-1.5 transition cursor-pointer hover:text-[#00d4aa] ${hoveredPin === i ? "text-[#00d4aa]" : "text-white/35"}`}
              onMouseEnter={() => setHoveredPin(i)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={() => handlePinClick(pin)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]/70" />
              {pin.label}
            </button>
          ))}
        </div>
      )}

      {/* Tooltip styles */}
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
        .whut-map-pin, .whut-map-pin-active {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          background: rgba(8, 12, 20, 0.5) !important;
          font-size: 9px !important;
        }
        .leaflet-control-zoom a {
          background: rgba(8, 12, 20, 0.8) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(8, 12, 20, 0.95) !important;
          color: #00d4aa !important;
        }
      `}</style>
    </div>
  );
}
