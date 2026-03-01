"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface AmbientBackgroundProps {
  accentColor?: string; // CSS color like "0, 212, 170"
  isThinking?: boolean;
  /** @deprecated Use isThinking instead */
  intensified?: boolean;
}

export default function AmbientBackground({ accentColor = "0, 212, 170", isThinking = false, intensified = false }: AmbientBackgroundProps) {
  const thinking = isThinking || intensified;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const thinkingRef = useRef(isThinking);
  const accentRef = useRef(accentColor);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  useEffect(() => { accentRef.current = accentColor; }, [accentColor]);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3 + 0.1,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.06 + 0.02,
        life: Math.random() * 1000,
        maxLife: 800 + Math.random() * 400,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) initParticles(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (timestamp: number) => {
      // Target ~30fps
      if (timestamp - lastTimeRef.current < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastTimeRef.current = timestamp;
      frameRef.current++;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const accent = accentRef.current;
      const thinking = thinkingRef.current;
      const time = frameRef.current * 0.02;

      ctx.clearRect(0, 0, w, h);

      // Layer 1: Perspective grid
      const gridOpacity = thinking ? 0.045 : 0.025;
      ctx.strokeStyle = `rgba(${accent}, ${gridOpacity})`;
      ctx.lineWidth = 0.5;
      const spacing = 80;
      const drift = time * 0.3;

      for (let i = -1; i < w / spacing + 1; i++) {
        const x = ((i * spacing + drift * 8) % (w + spacing)) - spacing;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let i = -1; i < h / spacing + 1; i++) {
        const y = ((i * spacing + drift * 4) % (h + spacing)) - spacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Layer 2: Data stream particles
      const speedMult = thinking ? 3.0 : 1.0;
      const centerX = w / 2;
      const centerY = h * 0.45;

      for (const p of particlesRef.current) {
        p.life += 1;
        if (p.life > p.maxLife) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.life = 0;
        }

        if (thinking) {
          // Particles drift toward center during thinking
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          p.vx += (dx / dist) * 0.02;
          p.vy += (dy / dist) * 0.02;
        }

        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Dampen velocity
        p.vx *= 0.998;
        p.vy *= 0.998;

        const lifeRatio = p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.9 ? (1 - lifeRatio) * 10 : 1;
        const alpha = p.alpha * fadeAlpha * (thinking ? 1.5 : 1);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent}, ${Math.min(alpha, 0.12)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "#06060f" }}
    />
  );
}
