"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(() => ({
    fullScreen: false,
    fpsLimit: 30,
    particles: {
      number: { value: 40, density: { enable: true } },
      color: { value: "#00d4aa" },
      opacity: { value: { min: 0.03, max: 0.08 } },
      size: { value: { min: 1, max: 2 } },
      move: { enable: true, speed: 0.3, direction: "none" as const, outModes: { default: "out" as const } },
      links: {
        enable: true,
        distance: 120,
        color: "#00d4aa",
        opacity: 0.05,
        width: 1,
      },
    },
    interactivity: {
      events: { onHover: { enable: true, mode: "grab" as const } },
      modes: { grab: { distance: 140, links: { opacity: 0.1 } } },
    },
    detectRetina: true,
  }), []);

  if (!ready) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-auto">
      <Particles id="hud-particles" options={options as any} className="w-full h-full" />
    </div>
  );
}
