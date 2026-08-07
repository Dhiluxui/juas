import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface BlueSilkBackgroundProps {
  /** Speed of the silk animation */
  speed?: number;
  /** Deep shadow color of the folds */
  colorShadow?: string;
  /** Main midtone color of the fabric */
  colorBase?: string;
  /** Bright specular highlight color */
  colorHighlight?: string;
  /** Optional content to render on top of the background */
  children?: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
}

export const BlueSilkBackground = ({
  speed = 1.0,
  colorShadow = '#000b29',    // Deep, almost black navy
  colorBase = '#0055ff',      // Rich royal/cyan blue
  colorHighlight = '#00eeff', // Bright electric cyan for the sheen
  children,
  className = '',
}: BlueSilkBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to 2 for performance while keeping it sharp on Retina displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const updateSize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      return { width, height };
    };

    const { width, height } = updateSize();
    container.appendChild(renderer.domElement);

    // Helper to parse Hex colors to THREE.Vector3 (RGB) for the shader
    const hexToVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_speed: { value: speed },
      u_colorShadow: { value: hexToVec3(colorShadow) },
      u_colorBase: { value: hexToVec3(colorBase) },
      u_colorHighlight: { value: hexToVec3(colorHighlight) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // This shader calculates organic diagonal folds using rotated coordinates 
    // and warped sine waves to simulate glossy satin/silk fabric lighting.
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      
      uniform vec3 u_colorShadow;
      uniform vec3 u_colorBase;
      uniform vec3 u_colorHighlight;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // 2D Random Hash
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // 2D Value Noise
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

      // Fractional Brownian Motion for fabric distortion
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 r = rot(0.5);
          for (int i = 0; i < 4; i++) {
              v += a * noise(p);
              p = r * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          
          // Aspect Ratio Correction
          p.x *= u_resolution.x / u_resolution.y;
          
          float t = u_time * u_speed;

          // Rotate coordinates to create diagonal folds (approx 45 degrees)
          p *= rot(0.7);

          // Domain Warping: distort the coordinate space using FBM to make the waves look organic
          float warp = fbm(vec2(p.x * 1.5 - t * 0.2, p.y * 1.5 + t * 0.3));
          
          // Layer multiple sine waves to create the pinching and swelling of fabric folds
          float wave = sin(p.x * 4.0 + warp * 2.5 - t * 1.2);
          wave += sin(p.x * 7.5 - p.y * 2.0 + warp * 1.5 + t * 0.8) * 0.4;
          wave += sin(p.x * 1.5 + p.y * 3.0 - warp * 1.0) * 0.3;

          // Normalize wave roughly to [0, 1] for easier color mapping
          wave = wave * 0.5 + 0.5;

          // ==========================================
          // LIGHTING & COLOR MAPPING
          // ==========================================
          vec3 color = u_colorShadow;
          
          // Map midtones
          color = mix(color, u_colorBase, smoothstep(0.1, 0.6, wave));
          
          // Map sharp highlights (creates the glossy metallic/silk look)
          color = mix(color, u_colorHighlight, smoothstep(0.75, 0.95, wave));

          // Add a tight, extremely bright specular reflection on the very peaks
          float specular = pow(max(0.0, wave), 8.0);
          color += u_colorHighlight * specular * 0.6;

          // Vignette to ground the edges
          float vignette = length(uv - 0.5) * 2.0;
          color *= 1.0 - smoothstep(0.8, 1.5, vignette) * 0.4;

          // Subtle dithering to prevent banding on the smooth gradients
          color += (hash(uv * 100.0 + t) - 0.5) * 0.03;

          gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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
      
      // Update Uniforms dynamically
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_speed.value = speed;
      
      uniforms.u_colorShadow.value.copy(hexToVec3(colorShadow));
      uniforms.u_colorBase.value.copy(hexToVec3(colorBase));
      uniforms.u_colorHighlight.value.copy(hexToVec3(colorHighlight));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const { width, height } = updateSize();
      uniforms.u_resolution.value.set(width, height);
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
  }, [speed, colorShadow, colorBase, colorHighlight]);

  return (
    <div className={`relative w-full h-full min-h-[600px] overflow-hidden bg-[#000b29] font-sans ${className}`}>
      {/* 2D WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Content Overlay Layer */}
      {children && (
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-full h-full">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="w-screen h-screen bg-[#000b29]">
      <BlueSilkBackground 
        speed={0.6} // Luxurious, moderate flowing speed
      >
      </BlueSilkBackground>
    </div>
  );
}