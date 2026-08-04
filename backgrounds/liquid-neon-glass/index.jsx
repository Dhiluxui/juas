import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface LiquidNeonGlassProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Glass Refraction Scale */
  refractionScale?: number;
  /** @title Film Grain Intensity */
  grainAmount?: number;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const LiquidNeonGlass: React.FC<LiquidNeonGlassProps> = ({
  speed = 1.0,
  refractionScale = 1.2,
  grainAmount = 0.02,
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

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 3. Shader Material & Uniforms
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_refractionScale: { value: refractionScale },
      u_grainAmount: { value: grainAmount },
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
      uniform float u_refractionScale;
      uniform float u_grainAmount;

      varying vec2 vUv;

      // 2D Rotation
      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // Simplex-style pseudo noise
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

      // Fractional Brownian Motion with domain distortion
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= rot(0.45);
          p *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        // Normalized coordinates centered
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.25 * u_speed;

        // Interactive mouse distortion wave
        float distToMouse = length(uv - mouse);
        float mouseWave = exp(-distToMouse * 4.0) * 0.2;
        vec2 mouseOffset = normalize(uv - mouse + 0.0001) * mouseWave;

        vec2 p = (uv + mouseOffset) * u_refractionScale;

        // 1. Triple-Layer Domain Warping for Viscous Liquid Motion
        vec2 q = vec2(0.0);
        q.x = fbm(p + vec2(0.0, t * 0.4));
        q.y = fbm(p + vec2(1.0, -t * 0.3));

        vec2 r = vec2(0.0);
        r.x = fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
        r.y = fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.12 * t);

        float f = fbm(p + 3.0 * r + vec2(t * 0.1, -t * 0.2));

        // 2. Chromatic Dispersion & Glass Ridge Shading
        // Glass specular ridges
        float ridgeR = pow(1.0 - abs(sin(q.x * 6.0 + q.y * 4.0 + t)), 12.0);
        float ridgeG = pow(1.0 - abs(sin(q.x * 6.0 + q.y * 4.0 + t + 0.08)), 12.0);
        float ridgeB = pow(1.0 - abs(sin(q.x * 6.0 + q.y * 4.0 + t + 0.16)), 12.0);

        // Neon color palettes
        vec3 colDeep = vec3(0.02, 0.0, 0.06);     // Dark obsidian void
        vec3 colNeonCyan = vec3(0.0, 0.95, 1.0);  // Electric cyan
        vec3 colNeonMagenta = vec3(1.0, 0.05, 0.6); // Neon pink/magenta
        vec3 colNeonViolet = vec3(0.5, 0.1, 1.0); // Liquid violet

        // Smooth color blending based on warped field
        vec3 col = mix(colDeep, colNeonViolet, f * 1.2);
        col = mix(col, colNeonMagenta, length(q));
        col = mix(col, colNeonCyan, r.x * r.y * 2.0);

        // Add specular glass highlights with chromatic dispersion
        col += vec3(ridgeR * 1.2, ridgeG * 0.9, ridgeB * 1.5) * (0.8 + 0.4 * f);

        // 3. Post-Processing Effects
        // Vignette
        float vignette = length(uv);
        col *= smoothstep(1.6, 0.2, vignette);

        // S-Curve Contrast Enhancement
        col = col * col * (3.0 - 2.0 * col) * 1.15;

        // Film Grain
        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * u_grainAmount;
        col += grain;

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

    // 4. Mouse event listeners
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

    // 5. Animation Loop
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

    // 6. Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Resource Cleanup
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
  }, [speed, refractionScale, grainAmount]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020005] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default LiquidNeonGlass;
