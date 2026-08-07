import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface SatinFluidBackgroundProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Deepest Shadow Color */
  color1?: string;
  /* @title Mid-Tone Purple/Violet */
  color2?: string;
  /* @title Soft Cyan/Blue Glow */
  color3?: string;
  /* @title Peak Highlight Color */
  color4?: string;
  /* @title Overlay Content */
  children?: React.ReactNode;
  /* @title Extra Classes */
  className?: string;
}

// Helper to convert hex strings to normalized RGB vectors for the shader
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
    : new THREE.Vector3(1.0, 1.0, 1.0);
};

export const SatinFluidBackground = ({
  speed = 5.0,
  color1 = '#02000a', // Deep Obsidian Black
  color2 = '#2a00ff', // Rich Royal Violet
  color3 = '#8cc1ff', // Soft Icy Cyan
  color4 = '#ffffff', // Pure White Peak
  children,
  className = '',
}: SatinFluidBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false, 
      powerPreference: 'high-performance' 
    });

    // Cap pixel ratio to ensure 60fps on high-res displays while keeping it crisp
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
      u_speed: { value: speed },
      u_color1: { value: hexToRgbVec3(color1) },
      u_color2: { value: hexToRgbVec3(color2) },
      u_color3: { value: hexToRgbVec3(color3) },
      u_color4: { value: hexToRgbVec3(color4) },
    };

    uniformsRef.current = uniforms;

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
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_color4;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // High-frequency hash function for cinematic film grain
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          // Normalize pixel coordinates
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          // Map to -1 to 1 space and adjust for aspect ratio
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // Apply gentle mouse parallax offset
          vec2 mouseOffset = u_mouse * 0.3;
          p -= mouseOffset;
          
          // Rotate the coordinate space diagonally to match the reference flow
          p *= rot(-0.6);
          
          float t = u_time * 0.2 * u_speed;
          
          // ==========================================
          // 1. KINETIC DOMAIN WARPING
          // ==========================================
          vec2 q = p;
          
          // Stretch the Y axis so the folds are broad and sweeping
          q.y *= 0.5;
          
          for(float i = 1.0; i <= 3.0; i++) {
              float fi = i * 1.5;
              q.x += 0.2 / fi * sin(fi * q.y * 2.0 + t + i * 1.2);
              q.y += 0.2 / fi * cos(fi * q.x * 1.5 - t * 0.8 + i * 1.2);
          }
          
          // ==========================================
          // 2. RIDGE GENERATION & 3D NORMALS
          // ==========================================
          float waveFreq = 2.0; 
          float baseWave = sin(q.x * waveFreq);
          
          // The Fold - using smoothstep for a softer, organic silk peak
          float fold = 1.0 - smoothstep(0.0, 0.8, abs(baseWave));
          
          // SURFACE NORMAL SIMULATION (The 3D Illusion)
          // We calculate the mathematical slope of the wave to determine lighting faces.
          // Approximate the sign function for an anti-aliased, smooth shadow transition.
          float smoothSign = baseWave / (abs(baseWave) + 0.02);
          float slope = -smoothSign * cos(q.x * waveFreq);
          
          // Light hits the left-facing slopes (positive slope)
          float lightFace = smoothstep(-0.1, 0.8, slope);
          
          // ==========================================
          // 3. COLOR & LIGHTING
          // ==========================================
          
          // GLOBAL LIGHTING
          // Light is intensely focused in the bottom left, fading to pitch black top-right
          float globalLight = 1.0 - smoothstep(-0.2, 1.6, uv.x + uv.y);
          
          vec3 finalColor = u_color1; // Deep Obsidian Black base
          
          // Base violet fill for the valleys and shadows
          float ambient = 0.1 * smoothstep(0.5, -1.0, slope) * globalLight;
          float violetMix = smoothstep(0.0, 0.6, fold) * globalLight + ambient;
          finalColor = mix(finalColor, u_color2, violetMix); 
          
          // Electric cyan illuminates the left-facing slopes
          float cyanMix = smoothstep(0.2, 1.0, fold) * lightFace * globalLight;
          finalColor = mix(finalColor, u_color3, cyanMix); 
          
          // Blazing white peak highlight rests exactly on the crests
          float whiteMix = pow(fold, 2.5) * lightFace * globalLight;
          finalColor += u_color4 * whiteMix * 0.5;

          // ==========================================
          // 4. POST-PROCESSING
          // ==========================================
          
          // Vignette
          float vignette = length(uv - 0.5);
          finalColor *= smoothstep(1.0, 0.2, vignette);
          
          // Contrast (S-Curve)
          finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);
          finalColor = pow(finalColor, vec3(1.2)); // Deepen the blacks slightly for richness
          
          // Cinematic Grain
          float grain = hash(uv * 100.0 + u_time) - 0.5;
          finalColor += grain * 0.05;

          gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
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
      
      mouseRef.current.lerp(targetMouseRef.current, 0.03);
      uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
      
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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y for WebGL
      
      targetMouseRef.current.set((x - 0.5) * 2.0, (y - 0.5) * 2.0);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);

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
  }, []);

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_color1.value = hexToRgbVec3(color1);
      uniformsRef.current.u_color2.value = hexToRgbVec3(color2);
      uniformsRef.current.u_color3.value = hexToRgbVec3(color3);
      uniformsRef.current.u_color4.value = hexToRgbVec3(color4);
    }
  }, [speed, color1, color2, color3, color4]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#02000a] font-sans ${className}`}>
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
    </div>
  );
};

export default SatinFluidBackground;