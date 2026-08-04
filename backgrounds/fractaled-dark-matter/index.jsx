import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface FractaledDarkMatterProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Dark Matter Density */
  density?: number;
  /** @title Energy Glow Intensity */
  energyGlow?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const FractaledDarkMatter: React.FC<FractaledDarkMatterProps> = ({
  speed = 0.8,
  density = 1.5,
  energyGlow = 1.3,
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

    // 1. Scene & Orthographic Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 3. Uniforms
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_density: { value: density },
      u_energyGlow: { value: energyGlow },
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
      uniform float u_density;
      uniform float u_energyGlow;

      varying vec2 vUv;

      // 2D Rotation Matrix
      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // Hash function for cosmic noise & particles
      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.17));
        p += dot(p, p + 56.23);
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

      // Multi-octave Fractal Brownian Motion for Dark Matter Tendrils
      float fractalMatter(vec2 p, float t) {
        float val = 0.0;
        float amp = 0.5;
        mat2 r = rot(0.5);

        for (int i = 0; i < 5; i++) {
          val += amp * abs(noise(p + vec2(sin(t * 0.2), cos(t * 0.3))) - 0.5) * 2.0;
          p = r * p * 2.1;
          amp *= 0.48;
        }
        return val;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.2 * u_speed;

        // Gravitational Lensing / Event Horizon distortion centered around mouse
        float mouseDist = length(uv - mouse);
        float gravLens = exp(-mouseDist * 3.5);
        vec2 warpedUv = uv + normalize(uv - mouse + 0.0001) * gravLens * 0.25;

        // Polar coordinates for spiral dark matter vortex
        float r = length(warpedUv);
        float a = atan(warpedUv.y, warpedUv.x);

        // Spiral rotation
        warpedUv *= rot(a * 0.2 + t * 0.3);
        vec2 p = warpedUv * u_density * 2.5;

        // Calculate multi-layer fractal dark matter field
        float matter1 = fractalMatter(p, t);
        float matter2 = fractalMatter(p * 1.5 + vec2(3.1, -1.7), t * 1.2);
        float fieldCombined = smoothstep(0.2, 0.9, matter1 * matter2 * 2.0);

        // Sharp energy filament ridges
        float filament = pow(1.0 - abs(matter1 - matter2), 8.0);

        // Cosmic particle stars floating in background
        float starGrid = hash(floor(gl_FragCoord.xy * 0.2) + floor(t * 5.0));
        float stars = pow(starGrid, 25.0) * (0.5 + 0.5 * sin(t * 10.0 + hash(gl_FragCoord.xy)));

        // Color Palettes: Dark Matter Void -> Electric Violet -> Deep Cyber Blue -> Quantum Flare
        vec3 voidBg = vec3(0.01, 0.005, 0.03);
        vec3 darkMatterCol = vec3(0.12, 0.02, 0.25);
        vec3 neonCyanCol = vec3(0.0, 0.8, 1.0);
        vec3 quantumVioletCol = vec3(0.7, 0.1, 1.0);

        // Composition
        vec3 col = voidBg;
        col = mix(col, darkMatterCol, fieldCombined * 1.5);
        col += quantumVioletCol * filament * u_energyGlow;
        col += neonCyanCol * gravLens * 1.5;
        col += vec3(0.9, 0.95, 1.0) * stars * (1.0 - length(uv) * 0.5);

        // Radial Vignette
        float vignette = smoothstep(1.5, 0.2, length(uv));
        col *= vignette;

        // Post-processing: High contrast tone-mapping
        col = pow(col, vec3(1.1));

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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

    // Mouse listener
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

    // Resize listener
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
  }, [speed, density, energyGlow]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#010005] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default FractaledDarkMatter;
