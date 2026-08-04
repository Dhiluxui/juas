import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface HolographicFluidDistortionProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Primary Color (Hex) */
  color1?: string;
  /** @title Secondary Color (Hex) */
  color2?: string;
  /** @title Accent Color (Hex) */
  color3?: string;
  /** @title Mouse Interaction Force */
  mouseForce?: number;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function HolographicFluidDistortion({
  speed = 0.35,
  color1 = '#ff007f',
  color2 = '#00f0ff',
  color3 = '#7000ff',
  mouseForce = 0.3,
  children,
  className = '',
}: HolographicFluidDistortionProps) {
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
        : new THREE.Vector3(1.0, 0.0, 0.5);
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
      u_color1: { value: hexToRgbVec3(color1) },
      u_color2: { value: hexToRgbVec3(color2) },
      u_color3: { value: hexToRgbVec3(color3) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_mouseForce: { value: mouseForce },
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
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec2 u_mouse;
      uniform float u_mouseForce;

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
          for(int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= rot(0.4);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        
        float t = u_time * u_speed;

        float distToMouse = length(uv - mouse);
        float mouseWave = exp(-distToMouse * 3.0) * u_mouseForce;
        vec2 mOffset = normalize(uv - mouse + 0.0001) * mouseWave;

        vec2 p = uv * 1.5 + mOffset;
        p *= rot(0.3 + sin(t * 0.2) * 0.1);

        for(float i = 1.0; i <= 4.0; i++) {
            p.x += 0.3 / i * sin(i * p.y * 2.5 + t + i * 0.5);
            p.y += 0.3 / i * cos(i * p.x * 2.0 - t * 0.8 + i * 0.5);
        }

        float n = fbm(p * 2.0 + t * 0.2);
        
        float rEdge = pow(1.0 - abs(sin(n * 6.28 + t * 1.5 + 0.1)), 12.0);
        float gEdge = pow(1.0 - abs(sin(n * 6.28 + t * 1.5)), 12.0);
        float bEdge = pow(1.0 - abs(sin(n * 6.28 + t * 1.5 - 0.1)), 12.0);

        vec3 bg = vec3(0.01, 0.005, 0.02);
        
        float colorMix = sin(p.x * 2.0 + p.y * 2.0 + t) * 0.5 + 0.5;
        vec3 fluidCol = mix(u_color1, u_color2, colorMix);
        fluidCol = mix(fluidCol, u_color3, n * 0.8);

        vec3 finalColor = bg + fluidCol * (n * 0.6 + 0.1);
        
        finalColor += vec3(rEdge * u_color1.r, gEdge * u_color2.g, bEdge * u_color3.b) * 1.5;

        float dist = length(uv);
        finalColor *= smoothstep(2.0, 0.3, dist);
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
  }, [speed, color1, color2, color3, mouseForce]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#030008] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default HolographicFluidDistortion;
