import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface BioluminescentFluidProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Plankton Particle Density */
  particleDensity?: number;
  /** @title Bioluminescence Intensity */
  glowIntensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const BioluminescentFluid: React.FC<BioluminescentFluidProps> = ({
  speed = 1.0,
  particleDensity = 1.0,
  glowIntensity = 1.2,
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
      u_particleDensity: { value: particleDensity },
      u_glowIntensity: { value: glowIntensity },
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
      uniform float u_particleDensity;
      uniform float u_glowIntensity;

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

      // Swirling fluid velocity field simulation
      float fluidNoise(vec2 p, float t) {
        float val = 0.0;
        mat2 r = rot(0.6);
        vec2 shift = vec2(sin(t * 0.3), cos(t * 0.2));

        for (int i = 0; i < 4; i++) {
          val += sin(p.x * 2.0 + t) * cos(p.y * 2.0 - t);
          p = r * p * 1.8 + shift;
        }
        return val;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.3 * u_speed;

        // Interactive pressure waves from cursor
        float mouseDist = length(uv - mouse);
        float mouseRipple = exp(-mouseDist * 5.0) * sin(mouseDist * 20.0 - t * 6.0) * 0.15;
        vec2 fluidUv = uv + (uv - mouse) * mouseRipple;

        // Domain warping for bioluminescent fluid currents
        vec2 p = fluidUv * 2.5;
        p.x += fluidNoise(p + vec2(t * 0.2, 0.0), t);
        p.y += fluidNoise(p + vec2(0.0, -t * 0.25), t);

        float density = sin(p.x * 3.0 + p.y * 3.0 + t);
        float caustics = pow(abs(density), 6.0);

        // Glowing bioluminescent plankton micro-particles floating along currents
        float particles = 0.0;
        vec2 particleUv = fluidUv * 18.0 * u_particleDensity;
        particleUv += vec2(sin(t + particleUv.y), cos(t * 0.8 + particleUv.x)) * 0.5;

        vec2 gridId = floor(particleUv);
        vec2 gridF = fract(particleUv) - 0.5;
        float pHash = hash(gridId);

        if (pHash > 0.82) {
          float pDist = length(gridF);
          float glow = 0.008 / (pDist + 0.001);
          particles += glow * (0.5 + 0.5 * sin(t * 4.0 + pHash * 6.28));
        }

        // Color Palettes: Abyssal Deep Navy -> Bioluminescent Emerald -> Cyber Cyan -> Deep Sea Violet
        vec3 abyssBg = vec3(0.005, 0.02, 0.05);
        vec3 emeraldGlow = vec3(0.0, 1.0, 0.5);
        vec3 cyanGlow = vec3(0.0, 0.85, 1.0);
        vec3 violetGlow = vec3(0.4, 0.1, 1.0);

        // Fluid color accumulation
        vec3 col = abyssBg;
        float fluidStrength = smoothstep(-0.8, 0.8, density);
        col = mix(col, violetGlow * 0.4, fluidStrength);
        col += mix(cyanGlow, emeraldGlow, sin(p.x + t) * 0.5 + 0.5) * caustics * u_glowIntensity;

        // Add plankton particle highlights
        col += mix(emeraldGlow, cyanGlow, pHash) * particles * 0.8;

        // Cursor bioluminescence glow
        col += emeraldGlow * exp(-mouseDist * 4.0) * 0.8;

        // Radial Vignette
        float vignette = smoothstep(1.6, 0.3, length(uv));
        col *= vignette;

        // Tone-mapping and gamma adjustment
        col = pow(col, vec3(0.95));

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
  }, [speed, particleDensity, glowIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#00040a] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default BioluminescentFluid;
