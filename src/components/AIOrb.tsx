"use client";
import { useEffect, useRef, useCallback } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "scene-active";

interface AIOrbProps {
  state?: OrbState;
  audioLevel?: number; // 0-1, optional for listening/speaking modulation
}

// ── Color definitions (RGB) ──
const COLORS: Record<OrbState, [number, number, number]> = {
  idle:           [14, 165, 233],   // cyan
  listening:      [59, 130, 246],   // blue
  thinking:       [16, 185, 129],   // emerald
  speaking:       [139, 92, 246],   // violet
  "scene-active": [56, 189, 210],   // muted cyan
};

const THINKING_ALT: [number, number, number] = [139, 92, 246];

// ── State configs (sphere mode) ──
interface StateConfig {
  rotSpeed: number;
  scale: number;
  particleSpread: number;
  breatheAmp: number;
  breatheFreq: number;
  opacity: number;
  glowIntensity: number;
  waveRings: boolean;
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
    rotSpeed: 0.15, scale: 1.0, particleSpread: 0.9,
    breatheAmp: 0.008, breatheFreq: 0.2, opacity: 1.0,
    glowIntensity: 0.15, waveRings: false,
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
const PARTICLE_COUNT = 2500;

interface Particle {
  theta: number;
  phi: number;
  radius: number;
  rnd: number;
  size: number;
  brightnessOffset: number;
  layer: number; // 0-2 (back, mid, front)
  stripWaveOffset: number;
  stripYOffset: number; // -1 to 1
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
      layer: Math.floor(Math.random() * 3),
      stripWaveOffset: Math.random() * Math.PI * 2,
      stripYOffset: (Math.random() - 0.5) * 2,
    });
  }
  return particles;
}

// Project 3D → 2D
function project(
  theta: number, phi: number, radius: number,
  rotY: number, rotX: number,
  cx: number, cy: number, orbRadius: number
): { x: number; y: number; z: number; visible: boolean } {
  let x = radius * Math.sin(phi) * Math.cos(theta);
  let y = radius * Math.cos(phi);
  let z = radius * Math.sin(phi) * Math.sin(theta);

  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x2 = x * cosY - z * sinY;
  const z2 = x * sinY + z * cosY;
  x = x2; z = z2;

  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = y * cosX - z * sinX;
  const z3 = y * sinX + z * cosX;
  y = y2; z = z3;

  const perspective = 3.5;
  const scale = perspective / (perspective + z);

  return {
    x: cx + x * orbRadius * scale,
    y: cy + y * orbRadius * scale,
    z,
    visible: z > -1.5,
  };
}

// ── Strip position for a particle ──
function getStripPosition(
  index: number, total: number,
  canvasWidth: number, canvasHeight: number,
  time: number, audioLevel: number,
  state: OrbState
): { x: number; y: number } {
  const progress = index / total;
  const x = progress * canvasWidth;

  // Wave motion — audio reactive
  const waveAmp = 8 + audioLevel * 25;
  const waveFreq = 3;
  const baseY = canvasHeight - 80;
  const y = baseY + Math.sin(progress * waveFreq * Math.PI * 2 + time * 2) * waveAmp;

  // Fluid jitter
  const jitter = Math.sin(index * 0.1 + time * 3) * 2;

  // Listening: breathing pulse
  let breathOffset = 0;
  if (state === "listening") {
    breathOffset = Math.sin(time * 2.5) * 6 * (0.5 + audioLevel);
  }

  return { x, y: y + jitter + breathOffset };
}

export default function AIOrb({ state = "idle", audioLevel = 0 }: AIOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const audioRef = useRef(audioLevel);
  stateRef.current = state;
  audioRef.current = audioLevel;

  const particlesRef = useRef<Particle[]>(createParticles(PARTICLE_COUNT));

  // Animated values
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
    morphProgress: 0, // 0 = sphere, 1 = strip
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    const startTime = performance.now();

    const LERP_FACTOR = 0.04;
    const COLOR_LERP = 0.03;
    const MORPH_LERP = 0.035; // ~800ms feel

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
      const audio = audioRef.current;

      // ── Determine if strip mode ──
      const isStripMode = currentState === "scene-active" || currentState === "thinking" || currentState === "speaking" || currentState === "listening";
      const targetMorph = isStripMode ? 1 : 0;
      // Faster return to sphere (0.05), slower morph to strip (0.035)
      const morphLerp = targetMorph < a.morphProgress ? 0.05 : MORPH_LERP;
      a.morphProgress = lerp(a.morphProgress, targetMorph, morphLerp);
      // Snap near endpoints
      if (Math.abs(a.morphProgress - targetMorph) < 0.001) a.morphProgress = targetMorph;

      const mp = a.morphProgress;

      // ── Lerp animated properties ──
      a.rotSpeed = lerp(a.rotSpeed, config.rotSpeed, LERP_FACTOR);
      a.scale = lerp(a.scale, config.scale, LERP_FACTOR);
      a.particleSpread = lerp(a.particleSpread, config.particleSpread, LERP_FACTOR);
      a.breatheAmp = lerp(a.breatheAmp, config.breatheAmp, LERP_FACTOR);
      a.breatheFreq = lerp(a.breatheFreq, config.breatheFreq, LERP_FACTOR);
      a.opacity = lerp(a.opacity, config.opacity, LERP_FACTOR);
      a.glowIntensity = lerp(a.glowIntensity, config.glowIntensity, LERP_FACTOR);
      a.waveRings = lerp(a.waveRings, config.waveRings ? 1 : 0, LERP_FACTOR);

      // Color
      let targetColor = COLORS[currentState];
      if (currentState === "thinking") {
        const flicker = Math.sin(elapsed * 3) * 0.5 + 0.5;
        targetColor = lerpColor(COLORS.thinking, THINKING_ALT, flicker * 0.3);
      }
      if (currentState === "speaking") {
        const shift = Math.sin(elapsed * 1.5) * 0.5 + 0.5;
        targetColor = lerpColor([139, 92, 246], [168, 85, 247], shift);
      }
      a.color = lerpColor(a.color, targetColor, COLOR_LERP);

      // ── Canvas dimensions ──
      const w = canvas.width / Math.min(window.devicePixelRatio, 2);
      const h = canvas.height / Math.min(window.devicePixelRatio, 2);

      // Sphere center
      const isMobile = w < 500;
      const baseRadius = isMobile ? 70 : 100;
      const orbRadius = baseRadius * a.scale;
      const sidebarOffset = w >= 768 ? 100 : 0;
      const cx = w / 2 + sidebarOffset;
      const cy = h * 0.4;
      const floatY = Math.sin(elapsed * Math.PI * 0.5) * 5 * (1 - mp);

      // Breathe
      const breathe = 1 + a.breatheAmp * Math.sin(elapsed * a.breatheFreq * Math.PI * 2);
      const audioMod = currentState === "listening" ? audio * 0.15 : 0;

      // Rotation
      const rotY = elapsed * a.rotSpeed;
      const rotX = Math.sin(elapsed * 0.3) * 0.15;

      // ── Clear ──
      ctx.clearRect(0, 0, w, h);

      // ── Sphere glow (fades out with morph) ──
      if (a.glowIntensity > 0.01 && mp < 0.95) {
        const sphereGlowAlpha = (1 - mp);
        const glowR = orbRadius * 2.5;
        const grad = ctx.createRadialGradient(cx, cy + floatY, orbRadius * 0.3, cx, cy + floatY, glowR);
        const [cr, cg, cb] = a.color;
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a.glowIntensity * 0.4 * sphereGlowAlpha})`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${a.glowIntensity * 0.1 * sphereGlowAlpha})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - glowR, cy + floatY - glowR, glowR * 2, glowR * 2);
      }

      // ── Strip glow (fades in with morph) ──
      if (mp > 0.3) {
        const [cr, cg, cb] = a.color;
        const glowAlpha = (mp - 0.3) * (1 / 0.7) * 0.18;
        const stripY = h - 80;
        const gradient = ctx.createLinearGradient(0, stripY - 25, 0, stripY + 25);
        gradient.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
        gradient.addColorStop(0.5, `rgba(${cr},${cg},${cb},${glowAlpha})`);
        gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, stripY - 25, w, 50);
      }

      // ── Speaking wave rings (sphere mode only) ──
      if (a.waveRings > 0.05 && mp < 0.5) {
        const ringFade = 1 - mp * 2;
        for (let r = 0; r < 3; r++) {
          const phase = (elapsed * 0.8 + r * 0.33) % 1;
          const ringRadius = orbRadius * (1 + phase * 1.2);
          const ringAlpha = (1 - phase) * 0.15 * a.waveRings * ringFade;
          const [cr, cg, cb] = a.color;
          ctx.beginPath();
          ctx.arc(cx, cy + floatY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ringAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // ── Render particles ──
      const effectiveSpread = a.particleSpread * breathe + audioMod;

      // Reduce active particles in strip mode
      const activeCount = Math.floor(lerp(PARTICLE_COUNT, 1500, mp));

      type Projected = { x: number; y: number; z: number; size: number; brightness: number };
      const projected: Projected[] = [];

      for (let i = 0; i < activeCount; i++) {
        const p = particles[i];

        // Sphere position
        const driftTheta = p.theta + Math.sin(elapsed * 0.3 + p.rnd * 20) * 0.02;
        const driftPhi = p.phi + Math.cos(elapsed * 0.25 + p.rnd * 30) * 0.015;

        const sphere = project(
          driftTheta, driftPhi, p.radius * effectiveSpread,
          rotY, rotX,
          cx, cy + floatY, orbRadius
        );

        // Strip position
        const strip = getStripPosition(i, activeCount, w, h, elapsed, audio, currentState);

        // Interpolate
        const finalX = lerp(sphere.x, strip.x, mp);
        const finalY = lerp(sphere.y, strip.y, mp);

        // Depth/brightness: in sphere mode use z-depth, in strip mode use uniform
        const depthFactor = (sphere.z + 1.5) / 3;
        const sphereBrightness = 0.3 + depthFactor * 0.7 + p.brightnessOffset;
        const stripBrightness = 0.5 + p.brightnessOffset + audio * 0.3;
        const brightness = lerp(sphereBrightness, stripBrightness, mp);

        // Size: smaller in strip mode
        const sphereSize = p.size * (0.4 + depthFactor * 0.8);
        const stripSize = lerp(0.6, 1.2, p.rnd);
        const sz = lerp(sphereSize, stripSize, mp);

        // In sphere mode, skip back-facing particles; in strip mode show all
        if (mp < 0.5 && !sphere.visible) continue;

        projected.push({
          x: finalX,
          y: finalY,
          z: sphere.z,
          size: sz,
          brightness: Math.max(0, Math.min(1, brightness)),
        });
      }

      // Sort back-to-front (only matters for sphere mode)
      if (mp < 0.8) {
        projected.sort((a, b) => a.z - b.z);
      }

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

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 20,
        pointerEvents: "none",
      }}
    />
  );
}
