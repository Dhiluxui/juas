import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface LuminousSlatsBackgroundProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Number of Vertical Columns */
  columns?: number;
  /* @title Deep Void Color */
  colorDark?: string;
  /* @title Midtone Nebula Color */
  colorMid?: string;
  /* @title Bright Core Color */
  colorLight?: string;
  /* @title Film Grain Intensity */
  grainIntensity?: number;
  /* @title Overlay Content */
  children?: React.ReactNode;
  /* @title Extra CSS Classes */
  className?: string;
}

export const LuminousSlatsBackground = ({
  speed = 1.0,
  columns = 18, // Reduced slightly to match the broader slats in the reference image
  colorDark = '#020b14',   // Deep textured navy
  colorMid = '#004d61',    // Rich ocean teal
  colorLight = '#00f0b5',  // Vibrant cyan/mint highlight
  grainIntensity = 0.12,   // Increased for that heavy, premium film grain look
  children,
  className = '',
}: LuminousSlatsBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const smoothMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    // Using an Orthographic Camera perfectly fitted for a 2D full-screen shader plane
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to ensure smooth 60fps on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const updateSize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      return { width, height };
    };

    const { width, height } = updateSize();
    container.appendChild(renderer.domElement);

    // Helper to convert Hex to THREE.Vector3 for shader uniforms
    const hexToVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_columns: { value: columns },
      u_colorDark: { value: hexToVec3(colorDark) },
      u_colorMid: { value: hexToVec3(colorMid) },
      u_colorLight: { value: hexToVec3(colorLight) },
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
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_columns;
      uniform vec3 u_colorDark;
      uniform vec3 u_colorMid;
      uniform vec3 u_colorLight;
      uniform float u_grain;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // 2D Hash function for grain/noise
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

      // Fractional Brownian Motion (FBM) for organic, fluid-like clouds
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 r = rot(0.37);
          for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = r * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          // Normalize coordinates (0.0 to 1.0)
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          // --- FAUX-3D SLAT MATHEMATICS ---
          // colId: Which specific column are we in?
          float colId = floor(uv.x * u_columns);
          
          // localX: Where are we inside that specific column? (0.0 = left edge, 1.0 = right edge)
          float localX = fract(uv.x * u_columns);

          // We sample the light field from the *center* of the slat
          // to give it a frosted, segmented look across the screen.
          float stepX = (colId + 0.5) / u_columns;
          vec2 sampleUV = vec2(mix(uv.x, stepX, 0.9), uv.y);
          
          // Aspect correction
          sampleUV.x *= u_resolution.x / u_resolution.y;
          
          float t = u_time * u_speed * 0.1;

          // --- DOMAIN WARPING & LIGHT PLACEMENT ---
          // Create the sweeping aurora/gas effect behind the glass
          vec2 warpedUV = sampleUV;
          warpedUV.x += fbm(sampleUV * 1.5 + vec2(t, 0.0)) * 0.3;
          warpedUV.y -= fbm(sampleUV * 2.0 - vec2(0.0, t * 1.2)) * 0.3;

          float n = fbm(warpedUV * 1.5);

          // Bias the lighting heavily to the bottom right corner (like the reference image)
          float cornerGlow = exp(-length(sampleUV - vec2(u_resolution.x/u_resolution.y, 0.0)) * 1.5);
          n += cornerGlow * 1.2;

          // --- MOUSE INTERACTION ---
          // Soft volumetric glow following cursor
          vec2 m = u_mouse;
          m.x *= u_resolution.x / u_resolution.y;
          float mouseDist = length(sampleUV - m);
          float mouseGlow = exp(-mouseDist * 3.0);
          n += mouseGlow * 0.4;

          // --- COLOR MAPPING ---
          vec3 col = u_colorDark;
          
          // Blend Midtone
          float midMask = smoothstep(0.1, 0.7, n);
          col = mix(col, u_colorMid, midMask);
          
          // Blend Highlight Core
          float lightMask = smoothstep(0.5, 1.2, n);
          col = mix(col, u_colorLight, lightMask);

          // --- APPLY PANEL SHADING (Faux Depth) ---
          // 1. Sharp shadow gap on the left edge of every slat
          float gap = smoothstep(0.0, 0.04, localX); 
          
          // 2. Smooth gradient rolling across the panel (left is dark, right is light)
          float panelCurve = mix(0.2, 1.0, pow(localX, 0.6));
          
          // 3. Specular highlight catching on the far right edge of the panel
          float edgeCatch = smoothstep(0.9, 1.0, localX) * lightMask;

          col *= gap;          // Apply structural gap
          col *= panelCurve;   // Apply volume shadow
          col += u_colorLight * edgeCatch * 0.6; // Add specular edge reflection

          // --- POST PROCESSING ---
          // S-Curve Contrast grading
          col = col * col * (3.0 - 2.0 * col);

          // Heavy Film Grain mapping (matches the rough texture in reference)
          float grain = hash(uv * vec2(300.0, 300.0) + t);
          col += (grain - 0.5) * u_grain;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1.0 - (event.clientY - rect.top) / rect.height; // Invert Y for WebGL
      
      mouseRef.current.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      uniforms.u_time.value = clock.getElapsedTime();
      
      // Update dynamic uniform properties
      uniforms.u_speed.value = speed;
      uniforms.u_columns.value = columns;
      uniforms.u_grain.value = grainIntensity;
      
      uniforms.u_colorDark.value.copy(hexToVec3(colorDark));
      uniforms.u_colorMid.value.copy(hexToVec3(colorMid));
      uniforms.u_colorLight.value.copy(hexToVec3(colorLight));

      // Interpolate mouse movement for buttery smooth, liquid trailing
      smoothMouseRef.current.lerp(mouseRef.current, 0.05);
      uniforms.u_mouse.value.copy(smoothMouseRef.current);

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
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, columns, colorDark, colorMid, colorLight, grainIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020b14] font-sans ${className}`}>
      {/* 2D WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
    </div>
  );
};

export default LuminousSlatsBackground;