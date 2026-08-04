import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface RoyalSilkFlowBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Primary Color (Hex) */
  colorBlue?: string;
  /** @title Secondary Color (Hex) */
  colorPurple?: string;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function RoyalSilkFlowBackground({
  speed = 0.25,
  colorBlue = '#0d40ff',
  colorPurple = '#8c1ae6',
  children,
  className = '',
}: RoyalSilkFlowBackgroundProps) {
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
        : new THREE.Vector3(0.05, 0.25, 1.0);
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
      u_colorBlue: { value: hexToRgbVec3(colorBlue) },
      u_colorPurple: { value: hexToRgbVec3(colorPurple) },
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
      uniform vec3 u_colorBlue;
      uniform vec3 u_colorPurple;

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        
        float t = u_time * u_speed; 
        
        vec3 finalColor = vec3(1.0); 

        for(float i = 1.0; i <= 4.0; i++) {
            vec2 p = uv;
            
            p *= rot(-0.6 + i * 0.08); 
            
            p.x += sin(p.y * 2.0 + t + i) * 0.4;
            p.y += cos(p.x * 1.5 - t * 0.8 + i) * 0.4;
            
            float nWave = sin(p.y * (3.0 + i * 0.4) - t * 1.2) * 0.5 + 0.5;
            
            float band = smoothstep(0.2, 0.6, nWave) * smoothstep(0.95, 0.65, nWave);
            
            float taper = smoothstep(-1.2, 0.8, sin(p.x * 1.5 + t * 0.5 + i));
            band *= taper;
            
            vec3 layerColor = mix(u_colorBlue, u_colorPurple, sin(uv.x * 2.0 + uv.y * 2.0 + t + i) * 0.5 + 0.5);
            
            finalColor = mix(finalColor, layerColor, band * 0.85);
        }
        
        float grain = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor -= grain * 0.025;

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
  }, [speed, colorBlue, colorPurple]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-white font-sans text-slate-800 ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default RoyalSilkFlowBackground;
