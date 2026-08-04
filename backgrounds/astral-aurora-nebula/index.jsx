import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface AstralAuroraNebulaProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Color Intensity */
  intensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const AstralAuroraNebula: React.FC<AstralAuroraNebulaProps> = ({
  speed = 0.5,
  intensity = 1.3,
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

    // 3. Shader Uniforms & Material
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
      uniform float u_intensity;

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
        for (int i = 0; i < 5; i++) {
          val += amp * noise(p);
          p *= rot(0.45);
          p *= 2.02;
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.3 * u_speed;

        // Interactive solar wind vector shift from cursor
        float mouseDist = length(uv - mouse);
        float solarWind = exp(-mouseDist * 3.0);
        vec2 windOffset = (uv - mouse) * solarWind * 0.25;

        vec2 apexUv = (uv + windOffset) - vec2(0.0, 0.75);
        float apexAngle = atan(apexUv.x, apexUv.y);
        float apexDist = length(apexUv);

        // Multi-layer FBM magnetic field curtains
        float auroraWave1 = fbm(vec2(apexAngle * 3.0, apexDist * 2.5 - t));
        float auroraWave2 = fbm(vec2(apexAngle * 6.0 - t * 1.5, apexDist * 1.2));

        float warpedAngle = apexAngle + (auroraWave1 - 0.5) * 0.6 + (auroraWave2 - 0.5) * 0.3;

        // Color Palette: Deep Cosmic Void -> Emerald -> Electric Cyan -> Magenta Flare
        vec3 colBg = vec3(0.01, 0.005, 0.04);
        vec3 colEmerald = vec3(0.0, 1.0, 0.6);
        vec3 colCyan = vec3(0.0, 0.85, 1.0);
        vec3 colMagenta = vec3(1.0, 0.05, 0.7);

        vec3 auroraCol = vec3(0.0);
        auroraCol += smoothstep(0.8, 0.1, abs(warpedAngle + 0.35)) * colEmerald;
        auroraCol += smoothstep(0.5, 0.05, abs(warpedAngle + 0.1)) * colCyan;
        auroraCol += smoothstep(0.3, 0.02, abs(warpedAngle - 0.15)) * colMagenta * 1.5;

        float rayMask = smoothstep(1.6, 0.0, abs(apexAngle));
        float fadeOut = smoothstep(1.6, 0.1, apexDist);

        vec3 finalAurora = auroraCol * rayMask * fadeOut * (0.2 / (apexDist * apexDist + 0.1));

        // Stellar particles
        float dustGrid = hash(gl_FragCoord.xy * 0.15 + t * 0.05);
        float stardust = pow(dustGrid, 30.0) * fadeOut * 2.0;

        vec3 col = colBg + finalAurora * u_intensity + vec3(0.9, 0.95, 1.0) * stardust;

        // Radial Vignette
        col *= smoothstep(1.6, 0.3, length(uv));

        // S-Curve Tone mapping
        col = pow(clamp(col, 0.0, 1.0), vec3(1.05));

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
  }, [speed, intensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020008] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default AstralAuroraNebula;
