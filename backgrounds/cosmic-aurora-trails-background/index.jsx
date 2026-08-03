import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface CosmicAuroraTrailsBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Color Intensity */
  intensity?: number;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function CosmicAuroraTrailsBackground({
  speed = 0.4,
  intensity = 1.3,
  children,
  className = '',
}: CosmicAuroraTrailsBackgroundProps) {
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
        
        float t = u_time * u_speed;
        vec3 finalColor = vec3(0.0);
        vec3 bg = vec3(0.01, 0.01, 0.04);

        vec2 apex_uv = uv - vec2(0.0, 0.8);
        float apexAngle = atan(apex_uv.x, apex_uv.y);
        float apexDist = length(apex_uv);
        
        float auroraWarp = fbm(uv * 3.0 - vec2(0.0, t * 0.5));
        float rayMask = smoothstep(0.6, 0.0, abs(apexAngle + auroraWarp * 0.5)); 
        
        vec3 auroraColor = mix(vec3(0.1, 1.0, 0.4), vec3(0.8, 0.1, 1.0), abs(apexAngle) * 1.5);
        auroraColor = mix(vec3(0.0, 0.8, 1.0), auroraColor, auroraWarp);
        
        vec3 auroraFinal = auroraColor * rayMask * (0.15 / (apexDist * apexDist + 0.1));

        vec2 streak_uv = uv * rot(-0.7);
        
        float fluidDistortion = fbm(uv * 1.5 + t * 0.2);
        streak_uv.x += fluidDistortion * 0.2; 
        streak_uv.y -= t * 1.2; 
        
        vec2 p = streak_uv;
        p.x *= 20.0; 
        p.y *= 1.5;

        float streaks = fbm(p);
        float streakMask = pow(streaks, 5.0) * 2.0;

        vec3 c_cyan = vec3(0.0, 0.8, 1.0);
        vec3 c_mag  = vec3(0.8, 0.1, 1.0);
        vec3 c_red  = vec3(1.0, 0.2, 0.1);
        
        float colorMix = sin(uv.x * 4.0 + uv.y * 3.0 + fluidDistortion * 5.0) * 0.5 + 0.5;
        vec3 trailBase = mix(c_cyan, c_mag, colorMix);
        vec3 trailColor = mix(trailBase, c_red, streakMask * 0.5);
        
        vec3 trailFinal = trailColor * streakMask;

        finalColor = bg + auroraFinal + trailFinal;
        
        float grain = fract(sin(dot(streak_uv * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += grain * vec3(0.5, 0.3, 1.0) * 0.05;

        finalColor *= smoothstep(2.5, 0.4, length(uv));

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
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020006] font-sans text-white ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default CosmicAuroraTrailsBackground;
