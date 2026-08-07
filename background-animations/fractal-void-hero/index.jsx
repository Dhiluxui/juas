import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface AuroraFrostSlatsProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Number of Vertical Panels */
  columns?: number;
  /* @title Hot Core Color (Bottom) */
  colorCore?: string;
  /* @title Mid-tone Nebula Color */
  colorMid?: string;
  /* @title Deep Outer Void Color */
  colorOuter?: string;
  /* @title Film Grain Intensity */
  grainIntensity?: number;
  /* @title Overlay Content */
  children?: React.ReactNode;
  /* @title Extra CSS Classes */
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

export const AuroraFrostSlats = ({
  speed = 1.0,
  columns = 9,
  colorCore = '#e0edff',   // Bright icy white/cyan core
  colorMid = '#3d00e0',    // Deep vivid purple
  colorOuter = '#000000',  // Pitch black void
  grainIntensity = 0.04,
  children,
  className = '',
}: AuroraFrostSlatsProps) => {
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

    // Cap pixel ratio to ensure smooth 60fps on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_columns: { value: columns },
      u_colorCore: { value: hexToRgbVec3(colorCore) },
      u_colorMid: { value: hexToRgbVec3(colorMid) },
      u_colorOuter: { value: hexToRgbVec3(colorOuter) },
      u_grain: { value: grainIntensity },
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
      uniform float u_columns;
      uniform vec3 u_colorCore;
      uniform vec3 u_colorMid;
      uniform vec3 u_colorOuter;
      uniform float u_grain;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // 2D Hash function for noise
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      // Smooth Value Noise
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion (FBM) for organic fluid motion
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 r = rot(0.37);
          for (int i = 0; i < 4; i++) {
              v += a * noise(p);
              p = r * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          // Normalize pixel coordinates (0.0 to 1.0)
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          float t = u_time * u_speed;

          // --- SPACE PARTITIONING (The Vertical Slats) ---
          // Divide the X axis into discrete columns
          float colId = floor(uv.x * u_columns);
          
          // Local X coordinate within the specific column (0.0 to 1.0)
          float localX = fract(uv.x * u_columns);

          // We sample the organic light field from the center of each column
          float colCenter = (colId + 0.5) / u_columns;
          
          // --- LIGHT PROFILING (The M-Shape Arch) ---
          // Creates a symmetrical arch that dips slightly in the absolute center
          float centerDist = abs(colCenter - 0.5);
          float structuralArch = sin(colCenter * 3.14159); // Broad arch
          float centerDip = smoothstep(0.0, 0.3, centerDist); // Pushes flanks higher than center
          float heightProfile = structuralArch * (0.6 + 0.4 * centerDip);
          
          // Add slow FBM movement per column for a dynamic equalizer effect
          float colNoise = fbm(vec2(colCenter * 2.0, t * 0.3)) * 0.3;
          
          // Calculate the final vertical offset for this column's light
          float y = uv.y - heightProfile * 0.6 - colNoise;

          // --- MOUSE INTERACTION ---
          // Create a localized magnetic pull that draws the light up towards the cursor
          vec2 m = u_mouse;
          float mouseDist = length(vec2((colCenter - m.x) * 1.5, uv.y - m.y));
          float mousePull = exp(-mouseDist * 6.0) * 0.25;
          y -= mousePull;

          // Ensure Y doesn't go negative so exponential decay works properly
          y = max(0.0, y);

          // --- VOLUMETRIC LIGHT FALLOFF (Exponential Decay) ---
          // Light scatters exponentially through a medium. 
          float coreIntensity = exp(-y * 12.0);
          float midIntensity  = exp(-y * 3.5);
          float outerIntensity = exp(-y * 1.0);

          // Combine the light layers
          vec3 finalColor = coreIntensity * u_colorCore 
                          + midIntensity * u_colorMid 
                          + outerIntensity * u_colorOuter;

          // --- FAUX 3D BEVELING & SHADING ---
          // 1. Structural Gap: Dark, sharp lines separating the panels
          float gap = smoothstep(0.0, 0.04, localX) * smoothstep(1.0, 0.96, localX);
          
          // 2. Soft Bevel: Simulate frosted tubes by making edges slightly darker than centers
          float bevel = mix(0.7, 1.1, smoothstep(0.0, 0.5, localX)) * mix(1.1, 0.6, smoothstep(0.5, 1.0, localX));

          // Apply physical structures to the light
          finalColor *= gap;
          finalColor *= (bevel * 1.2);

          // --- POST-PROCESSING ---
          // Enforce minimum black level
          finalColor = max(finalColor, vec3(0.005, 0.0, 0.01));

          // Film Grain / Dither to prevent color banding in deep gradients
          float grain = hash(uv * 300.0 + t);
          finalColor += (grain - 0.5) * u_grain;

          // S-Curve Contrast grading for cinematic pop
          finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);

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
      
      // Interpolate mouse movement for buttery smooth, delayed liquid reactions
      mouseRef.current.lerp(targetMouseRef.current, 0.05);
      uniforms.u_mouse.value.copy(mouseRef.current);
      
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
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y for standard WebGL
      targetMouseRef.current.set(x, y);
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

  // Sync dynamic props (Zero GPU teardown cost)
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_columns.value = columns;
      uniformsRef.current.u_colorCore.value = hexToRgbVec3(colorCore);
      uniformsRef.current.u_colorMid.value = hexToRgbVec3(colorMid);
      uniformsRef.current.u_colorOuter.value = hexToRgbVec3(colorOuter);
      uniformsRef.current.u_grain.value = grainIntensity;
    }
  }, [speed, columns, colorCore, colorMid, colorOuter, grainIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black font-sans ${className}`}>
      {/* 2D WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
    </div>
  );
};

export default AuroraFrostSlats;