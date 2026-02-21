"use client";

import { useMemo } from "react";

const ParticleBackground = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => ({
        id: i,
        size: Math.floor(Math.random() * 3) + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 6 + 4,
        opacity: Math.random() * 0.5 + 0.2,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-white/60"
          style={{
            width: p.size,
            height: p.size,
            top: `${p.top}%`,
            left: `${p.left}%`,
            opacity: p.opacity,
            animation: `star-twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;
