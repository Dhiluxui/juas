import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface HyperdimensionalHypercubeFieldProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Hypercube Lattice Scale */
  scale?: number;
  /** @title Energy Glow Intensity */
  glowIntensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const HyperdimensionalHypercubeField: React.FC<HyperdimensionalHypercubeFieldProps> = ({
  speed = 0.8,
  scale = 1.0,
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

    // 1. Scene & Camera
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
      u_scale: { value: scale },
      u_glow: { value: glowIntensity },
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
      uniform float u_glow;

      varying vec2 vUv;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // Box Signed Distance Function
      float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }

      // 4D Projection / Domain Folding Hypercube SDF
      float hypercubeMap(vec3 p, float t) {
        p.xy *= rot(t * 0.3);
        p.yz *= rot(t * 0.2);

        // Domain repetition for hypercube lattice
        vec3 q = mod(p * u_scale + 2.0, 4.0) - 2.0;

        float outerBox = sdBox(q, vec3(1.0));
        float innerBox = sdBox(q, vec3(0.6));

        // Hollow hypercube wireframe ridges
        return max(outerBox, -innerBox);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.4 * u_speed;

        // Gravity distortion centered on mouse
        float mouseDist = length(uv - mouse);
        float gravWarp = exp(-mouseDist * 3.5);
        vec2 warpedUv = uv + (uv - mouse) * gravWarp * 0.3;

        // Raymarching setup
        vec3 ro = vec3(0.0, 0.0, -3.5);
        vec3 rd = normalize(vec3(warpedUv, 1.0));

        float totalDist = 0.0;
        vec3 col = vec3(0.0);
        float glowAccum = 0.0;

        // Raymarching loop through hypercube lattice
        for (int i = 0; i < 32; i++) {
          vec3 p = ro + rd * totalDist;
          float d = hypercubeMap(p, t);

          // Volumetric accumulation for glowing wireframe edges
          glowAccum += 0.015 / (abs(d) + 0.02);

          d = max(abs(d), 0.02);
          totalDist += d * 0.5;

          if (totalDist > 10.0) break;
        }

        // Color Palette: Abyssal Navy -> Neon Cyan -> Quantum Violet Wireframes
        vec3 colBg = vec3(0.01, 0.02, 0.06);
        vec3 colCyan = vec3(0.0, 0.9, 1.0);
        vec3 colViolet = vec3(0.6, 0.1, 1.0);

        vec3 hyperGlow = mix(colCyan, colViolet, sin(t + totalDist * 0.5) * 0.5 + 0.5);

        col = colBg + hyperGlow * glowAccum * 0.12 * u_glow;
        col += colCyan * gravWarp * 0.8;

        // Radial Vignette
        col *= smoothstep(1.5, 0.2, length(uv));

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
  }, [speed, scale, glowIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#01030d] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default HyperdimensionalHypercubeField;
