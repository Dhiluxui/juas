import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface QuantumCausticPlasmaGridProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Primary Plasma Color (Hex) */
  primaryColor?: string;
  /** @title Secondary Glow Color (Hex) */
  secondaryColor?: string;
  /** @title Caustic Intensity */
  intensity?: number;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function QuantumCausticPlasmaGrid({
  speed = 0.5,
  primaryColor = '#00f0ff',
  secondaryColor = '#ff00aa',
  intensity = 1.3,
  children,
  className = '',
}: QuantumCausticPlasmaGridProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const targetMouseRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const hexToRgbVec3 = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result
        ? new THREE.Vector3(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
          )
        : new THREE.Vector3(0.0, 0.94, 1.0);
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_speed: { value: speed },
      u_primaryColor: { value: hexToRgbVec3(primaryColor) },
      u_secondaryColor: { value: hexToRgbVec3(secondaryColor) },
      u_intensity: { value: intensity },
      u_mouse: { value: new THREE.Vector2(0, 0) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      uniform vec3 u_primaryColor;
      uniform vec3 u_secondaryColor;
      uniform float u_intensity;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
          p = fract(p * vec2(234.34, 435.21));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);

        float t = u_time * u_speed;

        vec2 p = uv * 2.0;
        float distToMouse = length(uv - mouse);
        p += (uv - mouse) * exp(-distToMouse * 4.0) * 0.4;

        float c = 0.0;
        for (float i = 1.0; i <= 5.0; i++) {
            p.x += sin(p.y * 3.0 + t * 0.8 + i) * 0.2;
            p.y += cos(p.x * 3.0 - t * 0.6 + i) * 0.2;
            
            float caustic = abs(sin(p.x * 4.0 + p.y * 4.0 + t));
            caustic = pow(1.0 - caustic, 8.0);
            c += caustic / i;
        }

        vec3 bg = vec3(0.005, 0.01, 0.03);
        vec3 colorMix = mix(u_primaryColor, u_secondaryColor, sin(length(uv) * 3.0 - t) * 0.5 + 0.5);

        vec3 finalColor = bg + colorMix * c * u_intensity;

        float dust = hash(gl_FragCoord.xy * 0.1 + t * 0.05);
        if (dust > 0.98) {
            finalColor += vec3(0.8, 0.95, 1.0) * (dust - 0.98) * 50.0;
        }

        finalColor *= smoothstep(1.8, 0.2, length(uv));
        finalColor = pow(finalColor, vec3(1.1));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      mouseRef.current.lerp(targetMouseRef.current, 0.05);
      uniforms.u_mouse.value.copy(mouseRef.current);

      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouseRef.current.set(e.clientX - rect.left, rect.height - (e.clientY - rect.top));
    };

    container.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, primaryColor, secondaryColor, intensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#01030a] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default QuantumCausticPlasmaGrid;
