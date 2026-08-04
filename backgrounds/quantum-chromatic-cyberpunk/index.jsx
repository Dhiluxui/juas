import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface QuantumChromaticCyberpunkProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Grid Scale */
  gridScale?: number;
  /** @title Chromatic Aberration Intensity */
  chromaIntensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const QuantumChromaticCyberpunk: React.FC<QuantumChromaticCyberpunkProps> = ({
  speed = 1.0,
  gridScale = 12.0,
  chromaIntensity = 0.03,
  children,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 3. Shader Uniforms & Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_gridScale: { value: gridScale },
      u_chroma: { value: chromaIntensity },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_gridScale;
      uniform float u_chroma;

      varying vec2 vUv;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          val += amp * noise(p);
          p *= rot(0.5);
          p *= 2.0;
          amplitudeMask: amp *= 0.5;
        }
        return val;
      }

      // Cyberpunk Grid Pattern with Quantum Distortions
      float cyberGrid(vec2 st, float t) {
        vec2 gridUv = fract(st) - 0.5;
        vec2 lineDist = abs(gridUv);
        float lines = smoothstep(0.48, 0.5, max(lineDist.x, lineDist.y));

        float pulse = sin(st.x * 2.0 + st.y * 2.0 + t * 4.0) * 0.5 + 0.5;
        return lines * (0.6 + 0.4 * pulse);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.4 * u_speed;

        // Mouse Electromagnetic Ripple
        float mouseDist = length(uv - mouse);
        float electromagneticPulse = exp(-mouseDist * 4.0) * sin(mouseDist * 25.0 - t * 8.0);
        vec2 warpedUv = uv + normalize(uv - mouse + 0.0001) * electromagneticPulse * 0.12;

        // Rotated perspective grid coordinates
        vec2 p = warpedUv * rot(0.3 + 0.1 * sin(t * 0.5)) * (u_gridScale * 0.3);
        p.x += fbm(p + vec2(t * 0.3, 0.0));
        p.y += fbm(p + vec2(0.0, -t * 0.2));

        // Chromatic Aberration Sampling
        vec2 offsetR = vec2(u_chroma * 0.05, 0.0);
        vec2 offsetB = vec2(-u_chroma * 0.05, 0.0);

        float patternR = cyberGrid(p + offsetR, t);
        float patternG = cyberGrid(p, t);
        float patternB = cyberGrid(p + offsetB, t);

        // Cyberpunk Color Palette: Void -> Neon Cyan -> Electric Pink -> Cyber Yellow
        vec3 colDeep = vec3(0.02, 0.0, 0.08);
        vec3 colCyan = vec3(0.0, 1.0, 0.8);
        vec3 colPink = vec3(1.0, 0.0, 0.55);

        vec3 col = colDeep;
        col.r += patternR * colPink.r * 1.5;
        col.g += patternG * colCyan.g * 1.5;
        col.b += patternB * colCyan.b * 1.8;

        // Energy core glowing flare at grid intersections
        float energyCore = pow(patternG, 3.0) * 1.5;
        col += mix(colPink, colCyan, sin(t + p.x) * 0.5 + 0.5) * energyCore;

        // CRT Scanline overlay
        float scanline = sin(gl_FragCoord.y * 0.8 + t * 10.0) * 0.04;
        col -= scanline;

        // Vignette
        float vignette = smoothstep(1.5, 0.3, length(uv));
        col *= vignette;

        // High contrast S-curve tone mapping
        col = pow(clamp(col, 0.0, 1.0), vec3(1.1));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse Listener
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);

      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animId);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, gridScale, chromaIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020008] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default QuantumChromaticCyberpunk;
