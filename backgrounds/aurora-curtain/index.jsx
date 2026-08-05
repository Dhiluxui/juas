import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface HolographicFoilProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Grain Intensity */
  grainAmount?: number;
  /** @title Children Content Overlay */
  children?: React.ReactNode;
  /** @title Custom CSS Class */
  className?: string;
}

export const HolographicFoilBackground: React.FC<HolographicFoilProps> = ({
  speed = 0.35,
  grainAmount = 0.035,
  children,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const smoothMouseRef = useRef<[number, number]>([0.5, 0.5]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Orthographic Camera & Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_grain: { value: grainAmount },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_grain;
      varying vec2 vUv;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      // Cosine rainbow spectrum palette
      vec3 palette(float t, vec2 mouse) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67) + vec3(mouse.x * 0.2, mouse.y * 0.2, 0.1);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (uv - 0.5) * 2.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * u_speed;

        // Angle and distort space for sweeping foil folds
        vec2 q = p * rot(-0.4);
        q.y *= 0.35;

        // Domain Warping Loop
        for (float i = 1.0; i <= 4.0; i++) {
          q.x += 0.35 / i * sin(i * q.y * 3.5 + t + u_mouse.x * 1.5);
          q.y += 0.35 / i * cos(i * q.x * 3.5 - t + u_mouse.y * 1.5);
        }

        // Density for wave patterns
        float density = sin(q.x * 3.0 + q.y * 3.0 + t);

        // Metallic Gloss & Highlights
        float ridge = pow(1.0 - abs(density), 12.0);
        float softBody = smoothstep(-0.5, 0.8, density);

        // Base Holographic Color
        vec3 spectralColor = palette(density * 0.5 + 0.5 + t * 0.2, u_mouse);

        // Dark Foil Void Base
        vec3 bg = vec3(0.02, 0.01, 0.04);
        vec3 finalColor = mix(bg, spectralColor, softBody * 0.7);

        // Metallic High-Gloss Reflections
        finalColor += spectralColor * ridge * 2.2;

        // Chromatic Aberration Fringe at Edges
        float fringe = pow(length(p) * 0.4, 2.0);
        finalColor.r += fringe * 0.15;
        finalColor.b += fringe * 0.25;

        // Radial Vignette
        float dist = length(p);
        finalColor *= smoothstep(2.2, 0.3, dist);

        // Film Grain Texture
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233) + u_time)) * 43758.5453);
        finalColor += (grain - 0.5) * u_grain;

        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
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

    // 3. Pointer Interaction Handling
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = 1.0 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      mouseRef.current = [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
    };

    container.addEventListener('mousemove', handlePointerMove, { passive: true });

    // 4. Animation Loop & Resize Observer
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Smooth mouse lerp
      smoothMouseRef.current[0] += (mouseRef.current[0] - smoothMouseRef.current[0]) * (dt * 4.0);
      smoothMouseRef.current[1] += (mouseRef.current[1] - smoothMouseRef.current[1]) * (dt * 4.0);

      uniforms.u_mouse.value.set(smoothMouseRef.current[0], smoothMouseRef.current[1]);
      uniforms.u_time.value = clock.getElapsedTime();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 5. Disposal & Cleanup
    return () => {
      container.removeEventListener('mousemove', handlePointerMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, grainAmount]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#030106] ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />
      {children && <div className="relative z-10 w-full h-full pointer-events-none">{children}</div>}
    </div>
  );
};

export default HolographicFoilBackground;