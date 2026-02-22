"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export default function AIOrb({ state = "idle", size = 300 }: { state?: OrbState; size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + (Math.random() - 0.5) * 0.4;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Store base hue variation per particle
      baseColors[i * 3] = Math.random();
      baseColors[i * 3 + 1] = Math.random();
      baseColors[i * 3 + 2] = Math.random();

      const hue = 0.45 + Math.random() * 0.1;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.55 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
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
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5);
          vec3 glow = vColor * 1.5;
          vec3 finalColor = mix(glow, vColor, smoothstep(0.0, 0.3, dist));
          gl_FragColor = vec4(finalColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Rings
    const ringCount = 1500;
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array(ringCount * 3);
    const ringCol = new Float32Array(ringCount * 3);
    const ringSizes = new Float32Array(ringCount);

    for (let i = 0; i < ringCount; i++) {
      const t = (i / ringCount) * Math.PI * 2;
      const ringIdx = Math.floor(Math.random() * 3);
      const r = 0.8 + ringIdx * 0.25;
      const tilt = ringIdx * 0.3;

      ringPos[i * 3] = r * Math.cos(t) + (Math.random() - 0.5) * 0.1;
      ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.08 + Math.sin(tilt) * r * Math.sin(t) * 0.3;
      ringPos[i * 3 + 2] = r * Math.sin(t) + (Math.random() - 0.5) * 0.1;

      const color = new THREE.Color().setHSL(0.48, 1.0, 0.7 + Math.random() * 0.2);
      ringCol[i * 3] = color.r;
      ringCol[i * 3 + 1] = color.g;
      ringCol[i * 3 + 2] = color.b;
      ringSizes[i] = 1.5 + Math.random() * 3;
    }

    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
    ringGeo.setAttribute("color", new THREE.BufferAttribute(ringCol, 3));
    ringGeo.setAttribute("size", new THREE.BufferAttribute(ringSizes, 1));

    const ringMat = material.clone();
    const rings = new THREE.Points(ringGeo, ringMat);
    scene.add(rings);

    // Color targets for state transitions
    // idle: cyan-teal (original), listening: blue, thinking: green, speaking: purple
    const stateColors: Record<string, { h: number; s: number; l: number }> = {
      idle:      { h: 0.48, s: 0.9, l: 0.6 },
      listening: { h: 0.58, s: 0.85, l: 0.55 },  // blue
      thinking:  { h: 0.35, s: 0.9, l: 0.5 },    // green
      speaking:  { h: 0.78, s: 0.8, l: 0.6 },     // purple
    };

    let currentH = 0.48, currentS = 0.9, currentL = 0.6;

    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;
      const target = stateColors[currentState] || stateColors.idle;

      // Smooth color transition
      currentH += (target.h - currentH) * 0.03;
      currentS += (target.s - currentS) * 0.03;
      currentL += (target.l - currentL) * 0.03;

      // Update particle colors
      const colAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const variation = baseColors[i * 3] * 0.08 - 0.04;
        const c = new THREE.Color().setHSL(
          currentH + variation,
          currentS,
          currentL + baseColors[i * 3 + 1] * 0.2
        );
        colAttr.setXYZ(i, c.r, c.g, c.b);
      }
      colAttr.needsUpdate = true;

      // Update ring colors
      const ringColAttr = ringGeo.getAttribute("color") as THREE.BufferAttribute;
      for (let i = 0; i < ringCount; i++) {
        const c = new THREE.Color().setHSL(currentH + 0.02, 1.0, 0.7 + Math.random() * 0.05);
        ringColAttr.setXYZ(i, c.r, c.g, c.b);
      }
      ringColAttr.needsUpdate = true;

      // State-dependent animation
      let rotSpeed: number, pulse: number;
      switch (currentState) {
        case "listening":
          rotSpeed = 0.2;
          pulse = 1.0 + 0.04 * Math.sin(elapsed * 2); // gentle pulse
          break;
        case "thinking":
          rotSpeed = 0.8; // fast spin
          pulse = 1.0 + 0.02 * Math.sin(elapsed * 6);
          break;
        case "speaking":
          rotSpeed = 0.3;
          pulse = 1.0 + 0.08 * Math.sin(elapsed * 3.5); // smooth wave/glow
          break;
        default: // idle
          rotSpeed = 0.15;
          pulse = 1.0;
      }

      material.uniforms.uTime.value = elapsed;

      particles.rotation.y = elapsed * rotSpeed;
      particles.rotation.x = Math.sin(elapsed * 0.3) * 0.1;
      particles.scale.setScalar(pulse);

      rings.rotation.y = -elapsed * rotSpeed * 1.3;
      rings.rotation.x = 0.4 + Math.sin(elapsed * 0.5) * 0.1;
      rings.scale.setScalar(pulse);

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
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  // Glow color per state
  const glowColor = {
    idle: "rgba(0,212,170,0.12)",
    listening: "rgba(60,130,255,0.15)",
    thinking: "rgba(0,220,100,0.12)",
    speaking: "rgba(160,80,255,0.15)",
  }[state] || "rgba(0,212,170,0.12)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={mountRef} className="relative z-10" />
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          bottom: -50,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 2,
          height: 100,
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(25px)",
          transition: "background 0.5s ease",
        }}
      />
    </div>
  );
}
