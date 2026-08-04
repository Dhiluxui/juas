import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface PrismaticSilkAuroraBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function PrismaticSilkAuroraBackground({
  speed = 0.2,
  children,
  className = '',
}: PrismaticSilkAuroraBackgroundProps) {
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

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        
        float t = u_time * u_speed;
        
        vec3 finalColor = vec3(0.01, 0.0, 0.03); 

        for (float i = 1.0; i <= 4.0; i++) {
            vec2 p = uv;
            
            p *= rot(-0.5 + i * 0.05); 
            
            p.x += sin(p.y * 2.5 + t + i) * 0.3;
            p.y += cos(p.x * 2.0 - t + i) * 0.3;
            
            float waveParams = p.y * 3.0 + p.x * 2.0 - t * 1.2;
            float nWave = sin(waveParams);
            
            float fold = 1.0 - abs(nWave);

            float softVolume = smoothstep(0.0, 1.0, fold) * 0.35;

            float sharpEdge = pow(fold, 16.0);
            float edgeR = pow(1.0 - abs(sin(waveParams + 0.035)), 16.0);
            float edgeB = pow(1.0 - abs(sin(waveParams - 0.035)), 16.0);

            vec3 colBlue = vec3(0.0, 0.15, 1.0);
            vec3 colCyan = vec3(0.0, 0.9, 1.0);
            vec3 colMagenta = vec3(0.9, 0.0, 0.5);

            vec3 layerColor = mix(colBlue, colMagenta, sin(p.x * 3.0 + t) * 0.5 + 0.5);
            layerColor = mix(layerColor, colCyan, cos(p.y * 2.0 - t) * 0.5 + 0.5);

            finalColor += layerColor * softVolume;

            finalColor.r += layerColor.r * edgeR * 1.5;
            finalColor.g += layerColor.g * sharpEdge * 1.5;
            finalColor.b += layerColor.b * edgeB * 1.5;
        }

        float aura = exp(-length(uv) * 1.8);
        finalColor += vec3(0.0, 0.3, 0.6) * aura * 0.4;

        float dist = length(uv);
        finalColor *= smoothstep(1.8, 0.3, dist);

        float grain = fract(sin(dot(uv.xy, vec2(12.9898,78.233))) * 43758.5453);
        finalColor += grain * 0.02;

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
  }, [speed]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020005] font-sans selection:bg-fuchsia-500/30 ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default PrismaticSilkAuroraBackground;
