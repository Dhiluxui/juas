import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface BioluminescentNeuralSynapseProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Synapse Glow Color (Hex) */
  glowColor?: string;
  /** @title Node Count Factor */
  density?: number;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function BioluminescentNeuralSynapse({
  speed = 0.4,
  glowColor = '#00f0ff',
  density = 1.0,
  children,
  className = '',
}: BioluminescentNeuralSynapseProps) {
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
      u_glowColor: { value: hexToRgbVec3(glowColor) },
      u_density: { value: density },
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
      uniform vec3 u_glowColor;
      uniform float u_density;
      uniform vec2 u_mouse;

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);

        float t = u_time * u_speed;

        float distToMouse = length(uv - mouse);
        float mouseAttract = exp(-distToMouse * 3.5) * 0.3;

        vec2 p = uv * (3.0 * u_density) - (uv - mouse) * mouseAttract;

        float synapseVal = 0.0;
        for (float i = 1.0; i <= 4.0; i++) {
            p *= rot(0.5 + i * 0.2);
            p.x += sin(p.y * 2.0 + t + i) * 0.4;
            p.y += cos(p.x * 2.0 - t + i) * 0.4;

            float d = length(fract(p) - 0.5);
            synapseVal += (0.012 / (d + 0.001)) * (sin(t * 2.0 + i) * 0.3 + 0.7);
        }

        vec3 bg = vec3(0.005, 0.008, 0.02);
        vec3 col = bg + u_glowColor * synapseVal * 0.8;

        col += mix(vec3(0.8, 0.1, 0.9), u_glowColor, sin(t) * 0.5 + 0.5) * pow(synapseVal, 2.0) * 0.15;

        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        col += (grain - 0.5) * 0.03;

        col *= smoothstep(1.8, 0.3, length(uv));
        col = pow(col, vec3(1.1));

        gl_FragColor = vec4(col, 1.0);
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
  }, [speed, glowColor, density]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#010208] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default BioluminescentNeuralSynapse;
