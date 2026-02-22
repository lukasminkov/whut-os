"use client";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "scene-active";

interface AIOrbProps {
  state?: OrbState;
  size?: number;
  audioAnalyser?: AnalyserNode | null;
}

// Spring physics helper
class Spring {
  value: number;
  target: number;
  velocity = 0;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 150, damping = 18) {
    this.value = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update(dt: number) {
    const force = -this.stiffness * (this.value - this.target);
    const dampForce = -this.damping * this.velocity;
    this.velocity += (force + dampForce) * dt;
    this.value += this.velocity * dt;
  }

  set(target: number) {
    this.target = target;
  }

  snap(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }
}

// State color configs
const STATE_COLORS: Record<OrbState, { h: number; s: number; l: number }> = {
  idle:           { h: 0.48, s: 0.9,  l: 0.6  },  // cyan-teal
  listening:      { h: 0.58, s: 0.95, l: 0.55 },  // deep blue
  thinking:       { h: 0.40, s: 0.85, l: 0.5  },  // emerald-green → purple shift
  speaking:       { h: 0.82, s: 0.85, l: 0.6  },  // purple-magenta
  "scene-active": { h: 0.48, s: 0.7,  l: 0.5  },  // muted cyan
};

const STATE_CONFIG: Record<OrbState, {
  rotSpeed: number;
  scale: number;
  breatheAmp: number;
  breatheFreq: number;
  particleSpread: number;
  ringSpread: number;
  opacity: number;
  waveform: number; // 0 = sphere, 1 = full waveform dispersion
}> = {
  idle:           { rotSpeed: 0.15, scale: 1.0,  breatheAmp: 0.02, breatheFreq: 1.0,  particleSpread: 1.0,  ringSpread: 1.0, opacity: 1.0, waveform: 0 },
  listening:      { rotSpeed: 0.2,  scale: 1.1,  breatheAmp: 0.04, breatheFreq: 1.8,  particleSpread: 1.25, ringSpread: 1.2, opacity: 1.0, waveform: 0 },
  thinking:       { rotSpeed: 0.6,  scale: 0.85, breatheAmp: 0.015,breatheFreq: 4.0,  particleSpread: 0.7,  ringSpread: 0.75,opacity: 1.0, waveform: 0 },
  speaking:       { rotSpeed: 0.25, scale: 1.0,  breatheAmp: 0.06, breatheFreq: 2.5,  particleSpread: 1.0,  ringSpread: 1.0, opacity: 1.0, waveform: 1 },
  "scene-active": { rotSpeed: 0.08, scale: 0.4,  breatheAmp: 0.01, breatheFreq: 0.8,  particleSpread: 0.9,  ringSpread: 0.9, opacity: 0.45,waveform: 0 },
};

export default function AIOrb({ state = "idle", size = 300, audioAnalyser = null }: AIOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef(audioAnalyser);
  stateRef.current = state;
  analyserRef.current = audioAnalyser;

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ─── Particles (sphere cloud) ───
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3); // original sphere positions
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount); // per-particle random for variation

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + (Math.random() - 0.5) * 0.4;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      const hue = 0.45 + Math.random() * 0.1;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.55 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;
      randoms[i] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (2.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5);
          vec3 glow = vColor * 1.5;
          vec3 finalColor = mix(glow, vColor, smoothstep(0.0, 0.3, dist));
          gl_FragColor = vec4(finalColor, alpha * 0.8 * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ─── Rings ───
    const ringCount = 1500;
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array(ringCount * 3);
    const ringBasePos = new Float32Array(ringCount * 3);
    const ringCol = new Float32Array(ringCount * 3);
    const ringSizes = new Float32Array(ringCount);

    for (let i = 0; i < ringCount; i++) {
      const t = (i / ringCount) * Math.PI * 2;
      const ringIdx = Math.floor(Math.random() * 3);
      const r = 0.8 + ringIdx * 0.25;
      const tilt = ringIdx * 0.3;

      const x = r * Math.cos(t) + (Math.random() - 0.5) * 0.1;
      const y = (Math.random() - 0.5) * 0.08 + Math.sin(tilt) * r * Math.sin(t) * 0.3;
      const z = r * Math.sin(t) + (Math.random() - 0.5) * 0.1;

      ringPos[i * 3] = x;
      ringPos[i * 3 + 1] = y;
      ringPos[i * 3 + 2] = z;
      ringBasePos[i * 3] = x;
      ringBasePos[i * 3 + 1] = y;
      ringBasePos[i * 3 + 2] = z;

      const color = new THREE.Color().setHSL(0.48, 1.0, 0.7 + Math.random() * 0.2);
      ringCol[i * 3] = color.r;
      ringCol[i * 3 + 1] = color.g;
      ringCol[i * 3 + 2] = color.b;
      ringSizes[i] = 1.5 + Math.random() * 3;
    }

    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    ringGeo.setAttribute("color", new THREE.BufferAttribute(ringCol, 3));
    ringGeo.setAttribute("size", new THREE.BufferAttribute(ringSizes, 1));

    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uOpacity: { value: 1.0 },
      },
      vertexShader: material.vertexShader,
      fragmentShader: material.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const rings = new THREE.Points(ringGeo, ringMat);
    scene.add(rings);

    // ─── Springs for smooth interpolation ───
    const springs = {
      rotSpeed: new Spring(0.15, 120, 20),
      scale: new Spring(1.0, 130, 18),
      breatheAmp: new Spring(0.02, 100, 22),
      breatheFreq: new Spring(1.0, 100, 22),
      particleSpread: new Spring(1.0, 100, 20),
      opacity: new Spring(1.0, 80, 15),
      waveform: new Spring(0, 100, 20),
      colorH: new Spring(0.48, 60, 15),
      colorS: new Spring(0.9, 60, 15),
      colorL: new Spring(0.6, 60, 15),
      // Thinking color oscillation
      thinkingHue: new Spring(0, 80, 18),
    };

    // Audio frequency data buffer
    const freqData = new Uint8Array(64);

    const clock = new THREE.Clock();
    let animId: number;
    let lastTime = 0;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const dt = Math.min(elapsed - lastTime, 0.05); // cap delta
      lastTime = elapsed;

      const currentState = stateRef.current;
      const config = STATE_CONFIG[currentState] || STATE_CONFIG.idle;
      const targetColor = STATE_COLORS[currentState] || STATE_COLORS.idle;

      // Update spring targets
      springs.rotSpeed.set(config.rotSpeed);
      springs.scale.set(config.scale);
      springs.breatheAmp.set(config.breatheAmp);
      springs.breatheFreq.set(config.breatheFreq);
      springs.particleSpread.set(config.particleSpread);
      springs.opacity.set(config.opacity);
      springs.waveform.set(config.waveform);
      springs.colorH.set(targetColor.h);
      springs.colorS.set(targetColor.s);
      springs.colorL.set(targetColor.l);

      // Thinking: oscillate hue between green and purple
      if (currentState === "thinking") {
        const thinkOsc = Math.sin(elapsed * 2.0) * 0.5 + 0.5; // 0..1
        springs.colorH.set(0.35 + thinkOsc * 0.45); // green(0.35) → purple(0.80)
      }

      // Step all springs
      for (const s of Object.values(springs)) {
        s.update(dt);
      }

      const rotSpeed = springs.rotSpeed.value;
      const scaleVal = springs.scale.value;
      const breatheAmp = springs.breatheAmp.value;
      const breatheFreq = springs.breatheFreq.value;
      const spread = springs.particleSpread.value;
      const opacity = springs.opacity.value;
      const waveformMix = springs.waveform.value;
      const h = springs.colorH.value;
      const s = springs.colorS.value;
      const l = springs.colorL.value;

      // Get audio data if available (for speaking state)
      let audioEnergy = 0;
      let audioFreqs: number[] = [];
      const analyser = analyserRef.current;
      if (analyser && currentState === "speaking") {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
          audioFreqs.push(freqData[i] / 255);
        }
        audioEnergy = sum / (freqData.length * 255);
      }

      // Breathe pulse
      const breathe = 1.0 + breatheAmp * Math.sin(elapsed * breatheFreq * Math.PI * 2);

      // ─── Update particle positions & colors ───
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const colAttr = geometry.getAttribute("color") as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const rnd = randoms[i];

        // Sphere position (with spread)
        let x = bx * spread;
        let y = by * spread;
        let z = bz * spread;

        // Speaking waveform: disperse particles into horizontal wave
        if (waveformMix > 0.01) {
          // Map particle to a horizontal band position
          const bandX = (rnd * 2 - 1) * 2.8; // spread across width
          const freqIdx = Math.floor(rnd * 32);
          const freqVal = audioFreqs.length > freqIdx ? audioFreqs[freqIdx] : (0.3 + 0.4 * Math.sin(elapsed * 3 + rnd * 10));
          const waveY = -0.5 + freqVal * 1.8 * Math.sin(elapsed * 2.5 + bandX * 2 + rnd * 5); // wave height
          const waveZ = (Math.random() - 0.5) * 0.3;

          x = x * (1 - waveformMix) + bandX * waveformMix;
          y = y * (1 - waveformMix) + waveY * waveformMix;
          z = z * (1 - waveformMix) + waveZ * waveformMix;
        }

        // Small float/drift
        x += Math.sin(elapsed * 0.5 + rnd * 20) * 0.03;
        y += Math.cos(elapsed * 0.4 + rnd * 30) * 0.03;

        posAttr.setXYZ(i, x, y, z);

        // Color
        const variation = rnd * 0.06 - 0.03;
        const c = new THREE.Color().setHSL(
          h + variation,
          s,
          l + rnd * 0.15
        );
        colAttr.setXYZ(i, c.r, c.g, c.b);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // ─── Update ring positions & colors ───
      const ringPosAttr = ringGeo.getAttribute("position") as THREE.BufferAttribute;
      const ringColAttr = ringGeo.getAttribute("color") as THREE.BufferAttribute;

      for (let i = 0; i < ringCount; i++) {
        const bx = ringBasePos[i * 3];
        const by = ringBasePos[i * 3 + 1];
        const bz = ringBasePos[i * 3 + 2];

        ringPosAttr.setXYZ(i, bx * spread, by * spread, bz * spread);

        const c = new THREE.Color().setHSL(h + 0.02, 1.0, 0.7 + Math.sin(elapsed + i) * 0.03);
        ringColAttr.setXYZ(i, c.r, c.g, c.b);
      }
      ringPosAttr.needsUpdate = true;
      ringColAttr.needsUpdate = true;

      // ─── Apply transforms ───
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uOpacity.value = opacity;
      ringMat.uniforms.uTime.value = elapsed;
      ringMat.uniforms.uOpacity.value = opacity;

      const finalScale = scaleVal * breathe;
      particles.rotation.y = elapsed * rotSpeed;
      particles.rotation.x = Math.sin(elapsed * 0.3) * 0.1;
      particles.scale.setScalar(finalScale);

      rings.rotation.y = -elapsed * rotSpeed * 1.3;
      rings.rotation.x = 0.4 + Math.sin(elapsed * 0.5) * 0.1;
      rings.scale.setScalar(finalScale);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  // Glow color per state
  const glowColor = {
    idle:           "rgba(0,212,170,0.12)",
    listening:      "rgba(60,130,255,0.18)",
    thinking:       "rgba(0,220,100,0.15)",
    speaking:       "rgba(160,80,255,0.18)",
    "scene-active": "rgba(0,212,170,0.06)",
  }[state] || "rgba(0,212,170,0.12)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={mountRef} className="relative" />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -50,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 2,
          height: 100,
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(25px)",
          transition: "background 0.6s ease",
        }}
      />
    </div>
  );
}
