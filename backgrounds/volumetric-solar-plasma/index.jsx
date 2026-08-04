import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface VolumetricSolarPlasmaProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Solar Turbulence Scale */
  turbulenceScale?: number;
  /** @title Plasma Flame Intensity */
  heatIntensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const VolumetricSolarPlasma: React.FC<VolumetricSolarPlasmaProps> = ({
  speed = 1.0,
  turbulenceScale = 1.2,
  heatIntensity = 1.3,
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
      u_scale: { value: turbulenceScale },
      u_heat: { value: heatIntensity },
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
      uniform float u_scale;
      uniform float u_heat;

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

      // Turbulent Solar FBM
      float solarFbm(vec2 p, float t) {
        float val = 0.0;
        float amp = 0.5;
        mat2 r = rot(0.4);

        for (int i = 0; i < 5; i++) {
          val += amp * abs(noise(p + vec2(0.0, -t * 0.4)) - 0.5) * 2.0;
          p = r * p * 2.05 + vec2(sin(t * 0.2), cos(t * 0.15));
          amp *= 0.5;
        }
        return val;
      }

      // Black Body Thermal Radiation Color Ramp
      vec3 thermalRamp(float temp) {
        vec3 darkEmber = vec3(0.08, 0.01, 0.0);
        vec3 crimson = vec3(0.9, 0.1, 0.0);
        vec3 solarGold = vec3(1.0, 0.65, 0.0);
        vec3 whiteHot = vec3(1.0, 0.98, 0.85);

        vec3 col = mix(darkEmber, crimson, smoothstep(0.1, 0.4, temp));
        col = mix(col, solarGold, smoothstep(0.4, 0.75, temp));
        col = mix(col, whiteHot, smoothstep(0.75, 1.0, temp));

        return col;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.35 * u_speed;

        // Gravitational Heat Attraction towards cursor
        float mouseDist = length(uv - mouse);
        float mouseGrav = exp(-mouseDist * 3.0);
        vec2 warpedUv = uv + normalize(mouse - uv + 0.0001) * mouseGrav * 0.2;

        vec2 p = warpedUv * u_scale * 2.2;

        // Multi-layer domain warped plasma turbulence
        vec2 q = vec2(solarFbm(p, t), solarFbm(p + vec2(5.2, 1.3), t));
        vec2 r = vec2(solarFbm(p + 3.0 * q + vec2(1.7, 9.2), t), solarFbm(p + 3.0 * q + vec2(8.3, 2.8), t));

        float plasmaDensity = solarFbm(p + 3.5 * r, t);

        // Sunspot voids & coronal flare ridges
        float solarProminence = pow(plasmaDensity, 1.8) * u_heat;

        // Thermal color lookup
        vec3 col = thermalRamp(solarProminence);

        // Cursor heat flare burst
        col += vec3(1.0, 0.8, 0.4) * mouseGrav * 1.5;

        // Solar Corona edge fade
        float vignette = smoothstep(1.5, 0.3, length(uv));
        col *= vignette;

        // Post-processing: Soft bloom & gamma
        col = pow(clamp(col, 0.0, 1.0), vec3(0.95));

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
  }, [speed, turbulenceScale, heatIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#0a0200] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default VolumetricSolarPlasma;
