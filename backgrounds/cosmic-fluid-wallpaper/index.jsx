import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface CosmicFluidWallpaperProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Color Intensity */
  intensity?: number;
  /** @title Enable Mouse Interaction */
  interactive?: boolean;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const CosmicFluidWallpaper: React.FC<CosmicFluidWallpaperProps> = ({
  speed = 0.5,
  intensity = 1.2,
  interactive = true,
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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shaders
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_intensity: { value: intensity },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_intensity;
      varying vec2 vUv;

      // 2D Rotation matrix
      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // Hash function for noise
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // 2D Simplex/Value Noise
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

      // Fractal Brownian Motion
      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        float freq = 1.0;
        for (int i = 0; i < 5; i++) {
          val += amp * noise(p * freq);
          freq *= 2.02;
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        // Normalized coordinates (-1 to 1) with aspect ratio correction
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        
        // Mouse influence
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float mouseDist = length(uv - mouse);
        float mouseInteraction = exp(-mouseDist * 3.5);

        float t = u_time * 0.25 * u_speed;
        
        // Domain Warping for Fluid Cosmic Motion
        vec2 p = uv * 2.2;
        p *= rot(0.3 + t * 0.1);
        p += mouse * mouseInteraction * 0.35;

        // Multi-pass Domain Distortion
        for (float i = 1.0; i <= 4.0; i++) {
          float fi = i * 1.2;
          p.x += 0.35 / fi * sin(fi * p.y * 2.5 + t * 1.5 + mouseInteraction * 0.5);
          p.y += 0.35 / fi * cos(fi * p.x * 2.5 - t * 1.2 + mouseInteraction * 0.5);
        }

        // Fluid density calculation
        float density = fbm(p + vec2(t * 0.5, -t * 0.3));
        float secondary = fbm(p * 1.5 - vec2(t * 0.3, t * 0.4));

        // Glass-like ridge highlights
        float ridge = pow(1.0 - abs(sin(density * 6.28318 + t)), 8.0);
        float specular = pow(ridge, 2.5);

        // Color Palette
        vec3 deepVoid = vec3(0.01, 0.005, 0.035);
        vec3 electricCyan = vec3(0.0, 0.85, 1.0);
        vec3 neonMagenta = vec3(0.95, 0.1, 0.75);
        vec3 cosmicGold = vec3(1.0, 0.75, 0.2);

        // Spatial & fluid color mixing
        float colorMix = sin(p.x * 1.5 + p.y * 1.5 + t) * 0.5 + 0.5;
        vec3 fluidBase = mix(electricCyan, neonMagenta, colorMix);
        fluidBase = mix(fluidBase, cosmicGold, secondary * 0.6);

        // Layering
        vec3 finalColor = deepVoid;
        finalColor += fluidBase * (density * 0.85 + 0.15);
        finalColor += vec3(0.9, 0.95, 1.0) * specular * 1.5; // Specular highlights
        finalColor += fluidBase * mouseInteraction * 0.6;   // Cursor glow

        // Post-Processing: Radial Vignette
        float dist = length(uv);
        float vignette = smoothstep(1.8, 0.3, dist);
        finalColor *= vignette;

        // S-Curve Contrast & Gamma
        finalColor = pow(finalColor, vec3(1.1)) * u_intensity;
        finalColor = clamp(finalColor, 0.0, 1.0);

        // Film Grain
        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.03;
        finalColor += grain;

        gl_FragColor = vec4(finalColor, 1.0);
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

    // 3. Animation Loop & Mouse Handling
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse movement interpolation
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.05;
      m.y += (m.targetY - m.y) * 0.05;
      uniforms.u_mouse.value.set(m.x, m.y);

      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    // Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y for GLSL
      mouseRef.current.targetX = Math.min(Math.max(x, 0.0), 1.0);
      mouseRef.current.targetY = Math.min(Math.max(y, 0.0), 1.0);
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, intensity, interactive]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#030008] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default CosmicFluidWallpaper;
