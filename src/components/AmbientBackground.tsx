"use client";

import { useEffect, useRef } from "react";

// ── Particle types ──
interface GridState {
  offsetX: number;
  offsetY: number;
}

interface FloatingShape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  type: "hexagon" | "circle" | "diamond" | "line";
  opacity: number;
}

interface StreamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ScanPulse {
  y: number;
  opacity: number;
  speed: number;
  active: boolean;
  cooldown: number;
}

interface AmbientBackgroundProps {
  /** When true, grid brightens and particles accelerate (AI thinking) */
  intensified?: boolean;
}

// Subtle cyan/teal palette
const GRID_COLOR = "0, 212, 170";
const SHAPE_COLOR = "99, 102, 241";
const PARTICLE_COLOR = "0, 212, 170";
const SCAN_COLOR = "0, 212, 170";

export default function AmbientBackground({ intensified = false }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensifiedRef = useRef(intensified);
  const animRef = useRef<number>(0);

  useEffect(() => {
    intensifiedRef.current = intensified;
  }, [intensified]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Initialize state ──
    const grid: GridState = { offsetX: 0, offsetY: 0 };

    const shapes: FloatingShape[] = Array.from({ length: 20 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1,
      size: 8 + Math.random() * 30,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.003,
      type: (["hexagon", "circle", "diamond", "line"] as const)[Math.floor(Math.random() * 4)],
      opacity: 0.015 + Math.random() * 0.03,
    }));

    const particles: StreamParticle[] = Array.from({ length: 150 }, () => createParticle(w, h));

    const scan: ScanPulse = {
      y: -10,
      opacity: 0,
      speed: 2,
      active: false,
      cooldown: 600 + Math.random() * 400, // frames (~10-15s at 30fps)
    };

    let frame = 0;
    let lastTime = 0;
    const FPS = 30;
    const interval = 1000 / FPS;

    function loop(timestamp: number) {
      animRef.current = requestAnimationFrame(loop);
      const delta = timestamp - lastTime;
      if (delta < interval) return;
      lastTime = timestamp - (delta % interval);

      const intense = intensifiedRef.current;
      frame++;

      ctx!.clearRect(0, 0, w, h);

      // ── Layer 1: Perspective Grid ──
      const gridOpacity = intense ? 0.06 : 0.025;
      const spacing = 80;
      grid.offsetX += intense ? 0.4 : 0.08;
      grid.offsetY += intense ? 0.2 : 0.04;

      ctx!.strokeStyle = `rgba(${GRID_COLOR}, ${gridOpacity})`;
      ctx!.lineWidth = 0.5;

      // Vertical lines
      const startX = -(grid.offsetX % spacing);
      for (let x = startX; x < w; x += spacing) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }
      // Horizontal lines
      const startY = -(grid.offsetY % spacing);
      for (let y = startY; y < h; y += spacing) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      // ── Layer 2: Floating Geometric Shapes ──
      for (const shape of shapes) {
        shape.x += shape.vx * (intense ? 3 : 1);
        shape.y += shape.vy * (intense ? 3 : 1);
        shape.rotation += shape.rotSpeed * (intense ? 2 : 1);

        // Wrap around screen edges
        if (shape.x < -50) shape.x = w + 50;
        if (shape.x > w + 50) shape.x = -50;
        if (shape.y < -50) shape.y = h + 50;
        if (shape.y > h + 50) shape.y = -50;

        const alpha = intense ? shape.opacity * 2.5 : shape.opacity;
        ctx!.save();
        ctx!.translate(shape.x, shape.y);
        ctx!.rotate(shape.rotation);
        ctx!.strokeStyle = `rgba(${SHAPE_COLOR}, ${alpha})`;
        ctx!.lineWidth = 0.8;

        switch (shape.type) {
          case "hexagon":
            drawHexagon(ctx!, shape.size);
            break;
          case "circle":
            ctx!.beginPath();
            ctx!.arc(0, 0, shape.size / 2, 0, Math.PI * 2);
            ctx!.stroke();
            break;
          case "diamond":
            drawDiamond(ctx!, shape.size);
            break;
          case "line":
            ctx!.beginPath();
            ctx!.moveTo(-shape.size, 0);
            ctx!.lineTo(shape.size, 0);
            ctx!.stroke();
            break;
        }
        ctx!.restore();
      }

      // ── Layer 3: Data Stream Particles ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * (intense ? 3 : 1);
        p.y += p.vy * (intense ? 3 : 1);
        p.life--;

        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          particles[i] = createParticle(w, h);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI) * (intense ? 0.2 : 0.08);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${PARTICLE_COLOR}, ${alpha})`;
        ctx!.fill();
      }

      // ── Layer 4: Scan Pulse ──
      if (!scan.active) {
        scan.cooldown--;
        if (scan.cooldown <= 0 || (intense && scan.cooldown <= 100)) {
          scan.active = true;
          scan.y = -4;
          scan.opacity = intense ? 0.12 : 0.06;
        }
      }
      if (scan.active) {
        scan.y += scan.speed * (intense ? 3 : 1);
        const progress = scan.y / h;
        scan.opacity = Math.sin(progress * Math.PI) * (intense ? 0.12 : 0.06);

        const grad = ctx!.createLinearGradient(0, scan.y - 30, 0, scan.y + 2);
        grad.addColorStop(0, `rgba(${SCAN_COLOR}, 0)`);
        grad.addColorStop(0.7, `rgba(${SCAN_COLOR}, ${scan.opacity * 0.3})`);
        grad.addColorStop(1, `rgba(${SCAN_COLOR}, ${scan.opacity})`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, scan.y - 30, w, 32);

        // Bright leading edge
        ctx!.strokeStyle = `rgba(${SCAN_COLOR}, ${scan.opacity * 0.8})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, scan.y);
        ctx!.lineTo(w, scan.y);
        ctx!.stroke();

        if (scan.y > h + 10) {
          scan.active = false;
          scan.cooldown = 400 + Math.random() * 300;
        }
      }
    }

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1 }}
    />
  );
}

// ── Helpers ──
function createParticle(w: number, h: number): StreamParticle {
  const edge = Math.random();
  let x: number, y: number, vx: number, vy: number;
  if (edge < 0.25) { // left
    x = 0; y = Math.random() * h; vx = 0.3 + Math.random() * 0.5; vy = (Math.random() - 0.5) * 0.3;
  } else if (edge < 0.5) { // right
    x = w; y = Math.random() * h; vx = -(0.3 + Math.random() * 0.5); vy = (Math.random() - 0.5) * 0.3;
  } else if (edge < 0.75) { // top
    x = Math.random() * w; y = 0; vx = (Math.random() - 0.5) * 0.3; vy = 0.3 + Math.random() * 0.5;
  } else { // bottom
    x = Math.random() * w; y = h; vx = (Math.random() - 0.5) * 0.3; vy = -(0.3 + Math.random() * 0.5);
  }
  const maxLife = 300 + Math.random() * 400;
  return { x, y, vx, vy, life: maxLife, maxLife, size: 0.8 + Math.random() * 1.2 };
}

function drawHexagon(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(angle) * size / 2;
    const y = Math.sin(angle) * size / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.6, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.6, 0);
  ctx.closePath();
  ctx.stroke();
}
