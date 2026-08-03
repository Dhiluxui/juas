import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface NeonGlassFluidBorderProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Neon Glow Color */
  neonColor?: string;
  /** @title Fluid Glow Color */
  fluidColor?: string;
  /** @title Film Grain Intensity */
  grainIntensity?: number;
  /** @title Hero Title */
  title?: string;
  /** @title Hero Subtitle */
  subtitle?: string;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function NeonGlassFluidBorder({
  speed = 1.0,
  neonColor = '#0066ff',
  fluidColor = '#00f0ff',
  grainIntensity = 0.02,
  title = "NEON GLASS BORDER",
  subtitle = "Prismatic liquid domain warping with a vivid glowing rim frame.",
  children,
  className = '',
}: NeonGlassFluidBorderProps) {
  const mountRef = useRef<HTMLDivElement>(null);

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
        : new THREE.Vector3(0.0, 0.4, 1.0);
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
      u_neonColor: { value: hexToRgbVec3(neonColor) },
      u_fluidColor: { value: hexToRgbVec3(fluidColor) },
      u_grain: { value: grainIntensity },
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
      uniform vec3 u_neonColor;
      uniform vec3 u_fluidColor;
      uniform float u_grain;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

        float t = u_time * 0.25 * u_speed;
        vec3 finalColor = vec3(0.0);

        float edgeX = min(uv.x, 1.0 - uv.x);
        float edgeY = min(uv.y, 1.0 - uv.y);
        float edgeDist = min(edgeX, edgeY);

        float glowProfile = exp(-edgeDist * 12.0);
        vec3 frameGlow = u_neonColor * glowProfile * 1.2;
        frameGlow += mix(u_neonColor, u_fluidColor, 0.5) * exp(-edgeDist * 50.0);

        vec2 q = p;
        for (float i = 1.0; i <= 4.0; i++) {
          q.x += 0.3 / i * sin(i * q.y * 2.0 + t);
          q.y += 0.3 / i * cos(i * q.x * 2.0 - t * 0.8);
        }

        vec2 boxSize = vec2(u_resolution.x / u_resolution.y, 1.0) * 1.05;
        vec2 warpedD = abs(q) - boxSize;
        float warpedDist = length(max(warpedD, 0.0)) + min(max(warpedD.x, warpedD.y), 0.0);

        float centerDist = length(p);
        float edgeMask = smoothstep(0.2, 1.5, centerDist);

        float foldFrequency = 6.0;

        float r = pow(1.0 - abs(sin((warpedDist - 0.02) * foldFrequency + t * 2.0)), 7.0);
        float g = pow(1.0 - abs(sin((warpedDist + 0.00) * foldFrequency + t * 2.0)), 7.0);
        float b = pow(1.0 - abs(sin((warpedDist + 0.02) * foldFrequency + t * 2.0)), 7.0);

        vec3 liquidFolds = vec3(r * u_fluidColor.r, g * u_fluidColor.g, b * u_fluidColor.b * 1.5);
        vec3 fluidBase = u_neonColor * 0.4 * pow(1.0 - abs(sin(warpedDist * foldFrequency + t * 2.0)), 2.0);

        vec3 fluidEffect = (liquidFolds + fluidBase) * edgeMask;

        finalColor = frameGlow + fluidEffect;
        finalColor *= smoothstep(0.0, 0.8, centerDist);

        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += grain * u_grain;

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
  }, [speed, neonColor, fluidColor, grainIntensity]);

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden bg-[#000000] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 text-center">
        {children || (
          <div className="max-w-2xl flex flex-col items-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md text-xs font-mono text-cyan-400 uppercase tracking-widest shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Shader Wallpaper
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed">
              {subtitle}
            </p>

            <div className="flex items-center gap-4 pt-2">
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Get Started
              </button>
              <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                Learn More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NeonGlassFluidBorder;
