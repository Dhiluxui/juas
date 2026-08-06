import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface IridescentObsidianBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Enable Mouse Interaction */
  interactive?: boolean;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra CSS Classes */
  className?: string;
}

export const IridescentObsidianBackground = ({
  speed = 1.0,
  interactive = true,
  children,
  className = '',
}: IridescentObsidianBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    mountRef.current.appendChild(renderer.domElement);

    const currentMouse = new THREE.Vector2(0.5, 0.5);
    const targetMouse = new THREE.Vector2(0.5, 0.5);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: currentMouse },
      u_speed: { value: speed },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;

      vec3 palette(float t) {
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.00, 0.25, 0.40);
          return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          vec2 m = (u_mouse - 0.5) * 2.0;
          p += m * 0.1;

          float t = u_time * 0.12 * u_speed;

          vec2 q = p * vec2(1.3, 0.9);
          
          for (float i = 1.0; i <= 5.0; i++) {
              float fi = i;
              q.x += 0.35 / fi * cos(fi * 1.4 * q.y + t);
              q.y += 0.35 / fi * cos(fi * 1.4 * q.x - t * 0.8);
          }

          float caOffset = 0.04;
          float waveR = q.x * 2.2 - q.y * 2.2;
          float waveG = q.x * 2.2 - q.y * 2.2 + caOffset;
          float waveB = q.x * 2.2 - q.y * 2.2 + caOffset * 2.0;

          float specR = pow(0.5 + 0.5 * sin(waveR), 20.0);
          float specG = pow(0.5 + 0.5 * sin(waveG), 20.0);
          float specB = pow(0.5 + 0.5 * sin(waveB), 20.0);
          
          vec3 specular = vec3(specR, specG, specB) * 3.0;

          float softFold = pow(0.5 + 0.5 * sin(waveG), 2.5);
          vec3 ambientColor = palette(length(p) * 0.7 + t * 0.4);
          vec3 ambient = ambientColor * softFold * 0.5;

          vec3 baseColor = vec3(0.008, 0.008, 0.012);
          vec3 finalColor = baseColor + specular + ambient;

          float dist = length(uv - 0.5);
          finalColor *= 1.0 - smoothstep(0.3, 1.3, dist);

          finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);

          float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          finalColor -= grain * 0.035;

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

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      targetMouse.set(
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height
      );
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      uniforms.u_time.value = clock.getElapsedTime();
      
      if (interactive) {
        currentMouse.x += (targetMouse.x - currentMouse.x) * 0.06;
        currentMouse.y += (targetMouse.y - currentMouse.y) * 0.06;
        uniforms.u_mouse.value.set(currentMouse.x, currentMouse.y);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, interactive]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000000] font-sans ${className}`}>
      {/* Background WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Foreground Content Layer */}
      {children && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <IridescentObsidianBackground speed={1.0}>
    </IridescentObsidianBackground>
  );
}