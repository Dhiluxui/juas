import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface PrismaticAuroraBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Color Intensity */
  intensity?: number;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function PrismaticAuroraBackground({
  speed = 0.4,
  intensity = 1.2,
  children,
  className = '',
}: PrismaticAuroraBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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
      u_intensity: { value: intensity },
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
      uniform float u_intensity;

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
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for(int i = 0; i < 5; i++) {
              value += amplitude * noise(p * frequency);
              frequency *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        vec2 raw_uv = gl_FragCoord.xy / u_resolution.xy; 
        
        float t = u_time * u_speed;
        vec3 bg = vec3(0.0);

        vec2 apex_uv = raw_uv - vec2(0.5, 1.0);
        apex_uv.x *= u_resolution.x / u_resolution.y;

        float angle = atan(apex_uv.x, -apex_uv.y);
        float dist = length(apex_uv);

        float fold = fbm(vec2(angle * 2.5, dist * 2.0 - t));
        float fold2 = fbm(vec2(angle * 5.0 - t * 1.5, dist * 1.0));
        
        float warpedAngle = angle + (fold - 0.5) * 0.7 + (fold2 - 0.5) * 0.3;
        
        vec3 auroraColor = vec3(0.0);
        
        auroraColor += smoothstep(0.8, 0.1, abs(warpedAngle + 0.4)) * vec3(0.1, 0.8, 0.4);
        auroraColor += smoothstep(0.4, 0.05, abs(warpedAngle + 0.15)) * vec3(0.1, 0.7, 1.0);
        auroraColor += smoothstep(0.25, 0.02, abs(warpedAngle - 0.05)) * vec3(1.0, 0.1, 0.8) * 1.5;
        auroraColor += smoothstep(0.5, 0.05, abs(warpedAngle - 0.35)) * vec3(0.3, 1.0, 0.1);
        
        float coneMask = smoothstep(1.5, 0.0, abs(angle));
        float fadeOut = smoothstep(1.5, 0.0, dist);
        
        vec3 auroraFinal = auroraColor * coneMask * fadeOut * 1.5;

        float dust = hash(uv * 100.0 + t * 0.1);
        vec3 dustFinal = vec3(1.0) * smoothstep(0.99, 1.0, dust) * fadeOut * 0.5;

        vec3 finalColor = bg + auroraFinal + dustFinal;
        
        finalColor = 1.0 - exp(-finalColor * u_intensity);

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

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, intensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000000] font-sans text-white ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default PrismaticAuroraBackground;
