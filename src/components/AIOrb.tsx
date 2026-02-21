"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type OrbState = "idle" | "thinking" | "speaking";

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

    // Create particle system — sphere of particles
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const offsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Distribute on sphere surface with some depth variation
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + (Math.random() - 0.5) * 0.4;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Cyan-teal color palette with variation
      const hue = 0.45 + Math.random() * 0.1; // 0.45-0.55 = cyan to teal
      const color = new THREE.Color().setHSL(hue, 0.9, 0.55 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;
      speeds[i] = 0.2 + Math.random() * 0.8;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Custom shader for glowing particles
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

          // Add glow
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

    // Add inner ring particles (brighter, forming rings)
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

    // Animation
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;

      const rotSpeed = currentState === "thinking" ? 0.8 : currentState === "speaking" ? 0.4 : 0.15;
      const pulse = currentState === "speaking" ? 1.0 + 0.08 * Math.sin(elapsed * 4) : 1.0;

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

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={mountRef} className="relative z-10" />
      {/* Bottom illumination */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          bottom: -50,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 2,
          height: 100,
          background: "radial-gradient(ellipse at center, rgba(0,212,170,0.12) 0%, rgba(0,191,255,0.04) 40%, transparent 70%)",
          filter: "blur(25px)",
        }}
      />
    </div>
  );
}
