"use client";
import { useEffect, useRef, useCallback } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "scene-active";

interface AIOrbProps {
  state?: OrbState;
  audioLevel?: number; // 0-1, optional for listening modulation
}

// ── Color definitions (RGB) ──
const COLORS: Record<OrbState, [number, number, number]> = {
  idle:           [14, 165, 233],   // #0ea5e9 cyan
  listening:      [59, 130, 246],   // #3b82f6 blue
  thinking:       [16, 185, 129],   // #10b981 emerald
  speaking:       [139, 92, 246],   // #8b5cf6 violet
  "scene-active": [14, 165, 233],   // muted cyan (same base, opacity handles muting)
};

const THINKING_ALT: [number, number, number] = [139, 92, 246]; // purple flicker

// ── State configs ──
interface StateConfig {
  rotSpeed: number;       // rad/s around Y
  scale: number;          // multiplier
  particleSpread: number; // radius multiplier
  breatheAmp: number;     // 0-1
  breatheFreq: number;    // Hz
  opacity: number;
  glowIntensity: number;  // 0-1
  waveRings: boolean;     // speaking concentric pulses
}

const CONFIGS: Record<OrbState, StateConfig> = {
  idle: {
    rotSpeed: 0.2, scale: 1.0, particleSpread: 1.0,
    breatheAmp: 0.02, breatheFreq: 0.25, opacity: 1.0,
    glowIntensity: 0.3, waveRings: false,
  },
  listening: {
    rotSpeed: 0.3, scale: 1.1, particleSpread: 1.15,
    breatheAmp: 0.05, breatheFreq: 0.5, opacity: 1.0,
    glowIntensity: 0.5, waveRings: false,
  },
  thinking: {
    rotSpeed: 1.5, scale: 0.9, particleSpread: 0.8,
    breatheAmp: 0.015, breatheFreq: 0.8, opacity: 1.0,
    glowIntensity: 0.4, waveRings: false,
  },
  speaking: {
    rotSpeed: 0.8, scale: 1.0, particleSpread: 1.0,
    breatheAmp: 0.04, breatheFreq: 0.4, opacity: 1.0,
    glowIntensity: 0.5, waveRings: true,
  },
  "scene-active": {
    rotSpeed: 0.1, scale: 0.35, particleSpread: 0.9,
    breatheAmp: 0.005, breatheFreq: 0.2, opacity: 0.4,
    glowIntensity: 0.1, waveRings: false,
  },
};

// ── Lerp helpers ──
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ── Particle definition ──
interface Particle {
  // Spherical coordinates (fixed)
  theta: number;
  phi: number;
  radius: number;
  // Per-particle randomness
  rnd: number;
  size: number;
  brightnessOffset: number;
}

function createParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos(2 * Math.random() - 1),
      radius: 0.85 + Math.random() * 0.3,
      rnd: Math.random(),
      size: 0.8 + Math.random() * 1.8,
      brightnessOffset: Math.random() * 0.3 - 0.15,
    });
  }
  return particles;
}

// Project 3D → 2D (simple Y-axis rotation + perspective)
function project(
  theta: number, phi: number, radius: number,
  rotY: number, rotX: number,
  cx: number, cy: number, orbRadius: number
): { x: number; y: number; z: number; visible: boolean } {
  // Spherical to cartesian
  let x = radius * Math.sin(phi) * Math.cos(theta);
  let y = radius * Math.cos(phi);
  let z = radius * Math.sin(phi) * Math.sin(theta);

  // Rotate around Y
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x2 = x * cosY - z * sinY;
  const z2 = x * sinY + z * cosY;
  x = x2; z = z2;

  // Subtle X rotation
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = y * cosX - z * sinX;
  const z3 = y * sinX + z * cosX;
  y = y2; z = z3;

  // Perspective
  const perspective = 3.5;
  const scale = perspective / (perspective + z);

  return {
    x: cx + x * orbRadius * scale,
    y: cy + y * orbRadius * scale,
    z,
    visible: z > -1.5,
  };
}

export default function AIOrb({ state = "idle", audioLevel = 0 }: AIOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const audioRef = useRef(audioLevel);
  stateRef.current = state;
  audioRef.current = audioLevel;

  const particlesRef = useRef<Particle[]>(createParticles(2500));

  // Animated values (lerped each frame)
  const anim = useRef({
    rotSpeed: 0.2,
    scale: 1.0,
    particleSpread: 1.0,
    breatheAmp: 0.02,
    breatheFreq: 0.25,
    opacity: 1.0,
    glowIntensity: 0.3,
    waveRings: 0,
    color: [14, 165, 233] as [number, number, number],
    // Position: Y offset ratio (0 = center at 40%, 1 = top)
    posY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();

    const LERP_FACTOR = 0.04; // smooth transitions
    const COLOR_LERP = 0.03;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = particlesRef.current;

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const currentState = stateRef.current;
      const config = CONFIGS[currentState];
      const a = anim.current;

      // ── Lerp all animated properties ──
      a.rotSpeed = lerp(a.rotSpeed, config.rotSpeed, LERP_FACTOR);
      a.scale = lerp(a.scale, config.scale, LERP_FACTOR);
      a.particleSpread = lerp(a.particleSpread, config.particleSpread, LERP_FACTOR);
      a.breatheAmp = lerp(a.breatheAmp, config.breatheAmp, LERP_FACTOR);
      a.breatheFreq = lerp(a.breatheFreq, config.breatheFreq, LERP_FACTOR);
      a.opacity = lerp(a.opacity, config.opacity, LERP_FACTOR);
      a.glowIntensity = lerp(a.glowIntensity, config.glowIntensity, LERP_FACTOR);
      a.waveRings = lerp(a.waveRings, config.waveRings ? 1 : 0, LERP_FACTOR);
      a.posY = lerp(a.posY, currentState === "scene-active" ? 1 : 0, LERP_FACTOR);

      // Color target — thinking flickers between green and purple
      let targetColor = COLORS[currentState];
      if (currentState === "thinking") {
        const flicker = Math.sin(elapsed * 3) * 0.5 + 0.5;
        targetColor = lerpColor(COLORS.thinking, THINKING_ALT, flicker * 0.3);
      }
      // Speaking: gradient between violet shades
      if (currentState === "speaking") {
        const shift = Math.sin(elapsed * 1.5) * 0.5 + 0.5;
        targetColor = lerpColor([139, 92, 246], [168, 85, 247], shift);
      }
      a.color = lerpColor(a.color, targetColor, COLOR_LERP);

      // ── Canvas dimensions ──
      const w = canvas.width / Math.min(window.devicePixelRatio, 2);
      const h = canvas.height / Math.min(window.devicePixelRatio, 2);

      // Base orb radius (responsive)
      const isMobile = w < 500;
      const baseRadius = isMobile ? 70 : 100;
      const orbRadius = baseRadius * a.scale;

      // Position
      const cx = w / 2;
      // Normal: 40% from top. Scene-active: 60px from top
      const normalY = h * 0.4;
      const sceneY = 60 + orbRadius;
      const cy = lerp(normalY, sceneY, a.posY);

      // Floating Y offset (idle bob)
      const floatY = Math.sin(elapsed * Math.PI * 0.5) * 5 * (1 - a.posY);

      // Breathe
      const breathe = 1 + a.breatheAmp * Math.sin(elapsed * a.breatheFreq * Math.PI * 2);

      // Audio modulation for listening
      const audioMod = currentState === "listening" ? audioRef.current * 0.15 : 0;

      // Rotation angle
      const rotY = elapsed * a.rotSpeed;
      const rotX = Math.sin(elapsed * 0.3) * 0.15;

      // ── Clear ──
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = a.opacity;

      // ── Glow behind orb ──
      if (a.glowIntensity > 0.01) {
        const glowR = orbRadius * 2.5;
        const grad = ctx.createRadialGradient(cx, cy + floatY, orbRadius * 0.3, cx, cy + floatY, glowR);
        const [cr, cg, cb] = a.color;
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a.glowIntensity * 0.4})`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${a.glowIntensity * 0.1})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - glowR, cy + floatY - glowR, glowR * 2, glowR * 2);
      }

      // ── Speaking wave rings ──
      if (a.waveRings > 0.05) {
        const ringCount = 3;
        for (let r = 0; r < ringCount; r++) {
          const phase = (elapsed * 0.8 + r * 0.33) % 1;
          const ringRadius = orbRadius * (1 + phase * 1.2);
          const ringAlpha = (1 - phase) * 0.15 * a.waveRings;
          const [cr, cg, cb] = a.color;
          ctx.beginPath();
          ctx.arc(cx, cy + floatY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ringAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // ── Render particles (back-to-front via z-sort) ──
      // Build projected array
      type Projected = { x: number; y: number; z: number; size: number; brightness: number };
      const projected: Projected[] = [];

      const effectiveSpread = a.particleSpread * breathe + audioMod;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Slight drift per particle
        const driftTheta = p.theta + Math.sin(elapsed * 0.3 + p.rnd * 20) * 0.02;
        const driftPhi = p.phi + Math.cos(elapsed * 0.25 + p.rnd * 30) * 0.015;

        const { x, y, z, visible } = project(
          driftTheta, driftPhi, p.radius * effectiveSpread,
          rotY, rotX,
          cx, cy + floatY, orbRadius
        );

        if (!visible) continue;

        // Depth-based sizing and brightness
        const depthFactor = (z + 1.5) / 3; // 0 (far) to 1 (near)
        const sz = p.size * (0.4 + depthFactor * 0.8);
        const brightness = 0.3 + depthFactor * 0.7 + p.brightnessOffset;

        projected.push({ x, y, z, size: sz, brightness: Math.max(0, Math.min(1, brightness)) });
      }

      // Sort back to front
      projected.sort((a, b) => a.z - b.z);

      const [cr, cg, cb] = a.color;
      for (const pt of projected) {
        const r = Math.round(cr * pt.brightness);
        const g = Math.round(cg * pt.brightness);
        const b = Math.round(cb * pt.brightness);
        const alpha = pt.brightness * 0.85;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const isSceneActive = state === "scene-active";

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: isSceneActive ? 5 : 10,
        pointerEvents: isSceneActive ? "none" : "none", // orb never captures events
      }}
    />
  );
}
