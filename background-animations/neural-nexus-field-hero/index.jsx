import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface PrismaticPanelsBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Panel Count */
  panelCount?: number;
  /** @title Deep Violet Base */
  color1?: string;
  /** @title Neon Pink */
  color2?: string;
  /** @title Vibrant Orange */
  color3?: string;
  /** @title Cyan Highlight */
  color4?: string;
  /** @title Enable Mouse Parallax */
  interactive?: boolean;
  /** @title Content Overlay */
  children?: React.ReactNode;
  /** @title Extra CSS Classes */
  className?: string;
}

export const PrismaticPanelsBackground = ({
  speed = 0.5,
  panelCount = 7.0,
  color1 = '#2e008b', // Deep Violet
  color2 = '#ff007f', // Neon Pink
  color3 = '#ffaa00', // Vibrant Orange
  color4 = '#00d4ff', // Cyan
  interactive = true,
  children,
  className = '',
}: PrismaticPanelsBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Track mouse coordinates for smooth lerping
  const currentMouse = useRef({ x: 0.5, y: 0.5 });
  const targetMouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!mountRef.current) return;

    // Helper to convert hex to THREE.Vector3 RGB
    const hexToVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    const scene = new THREE.Scene();

    // Orthographic camera is perfect for 2D flat shaders
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Optimize for retina displays while capping at 2x for stable 60fps
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    mountRef.current.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_panelCount: { value: panelCount },
      u_color1: { value: hexToVec3(color1) },
      u_color2: { value: hexToVec3(color2) },
      u_color3: { value: hexToVec3(color3) },
      u_color4: { value: hexToVec3(color4) },
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
      uniform float u_panelCount;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_color4;

      void main() {
        // Normalize coordinates and adjust for aspect ratio
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        // Smooth interactive parallax/tilt based on mouse
        vec2 m = u_mouse - 0.5;
        p.x -= m.x * 0.4;
        p.y -= m.y * 0.4;

        float t = u_time * u_speed;
        
        // 1. MACRO WARPING
        // Subtly curve the entire vertical space
        float globalWarp = sin(p.y * 1.5 + t * 0.8) * 0.15 + cos(p.y * 0.5 - t * 0.4) * 0.1;
        float warpedX = p.x + globalWarp;

        // 2. DISCRETE GLASS PANELS
        // Divide the continuous space into distinct vertical strips
        float panelId = floor(warpedX * u_panelCount);
        // Local X coordinate within the current panel (-0.5 to 0.5)
        float lx = fract(warpedX * u_panelCount) - 0.5; 
        
        // 3. INTERNAL FLUID WAVES
        // Wavy displacement inside the panel, unique per panel ID
        float wave1 = sin(p.y * 2.5 + panelId * 2.1 + t) * 0.25;
        float wave2 = cos(p.y * 4.0 - panelId * 1.3 - t * 1.2) * 0.15;
        float distortedLx = lx - (wave1 + wave2);
        
        // 4. COLOR MIXING (INIGO QUILEZ STYLE PHASE SHIFTING)
        float mix1 = sin(panelId * 0.8 + p.y * 1.2 + t + distortedLx * 4.0) * 0.5 + 0.5;
        float mix2 = cos(panelId * 1.2 - p.y * 0.8 + t * 0.8 - distortedLx * 3.0) * 0.5 + 0.5;
        float mix3 = sin(panelId * 1.5 + t * 1.5 + distortedLx * 2.0) * 0.5 + 0.5;
        
        vec3 cBase = mix(u_color1, u_color2, mix1);
        cBase = mix(cBase, u_color3, mix2);
        cBase = mix(cBase, u_color4, mix3);

        // 5. INTERNAL SHADOWS & HIGHLIGHTS (SILK FOLDS)
        // High frequency sine wave creates the overlapping folds of liquid
        float fold = sin(distortedLx * 12.0 + t * 2.0);
        float foldHighlight = pow(smoothstep(0.5, 1.0, fold), 3.0);
        float foldShadow = smoothstep(-1.0, 0.5, fold);
        
        // Apply shadows to base color to create 3D volume
        vec3 col = cBase * (foldShadow * 0.6 + 0.4);
        
        // Add searing bright highlights on the crests of the folds
        col += mix(u_color2, vec3(1.0), 0.5) * foldHighlight * 0.8;

        // 6. PHYSICAL GLASS BEVELING
        // Calculate distance to the edge of the current panel
        float edgeDist = abs(abs(lx) - 0.5); 
        // Razor sharp edge glow (light catching the bevel)
        float edgeHighlight = exp(-edgeDist * 40.0);
        // Soft interior shadow
        float edgeShadow = smoothstep(0.3, 0.5, abs(lx));
        
        col += cBase * edgeHighlight * 0.8; // Edge transmission
        col -= edgeShadow * 0.3;            // Recess depth
        
        // Specular reflection purely on the right edge of each panel
        float spec = smoothstep(0.48, 0.5, lx);
        col += vec3(1.0) * spec * 0.3;
        
        // Hard black lines separating the panels
        col *= smoothstep(0.0, 0.02, edgeDist);

        // 7. POST-PROCESSING
        // Radial Vignette
        float vig = length(uv - 0.5) * 2.0;
        col *= 1.0 - smoothstep(0.6, 1.8, vig);

        // Cinematic Film Grain
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (grain - 0.5) * 0.04;
        
        // S-Curve Tone Mapping for rich contrast
        col = col * col * (3.0 - 2.0 * col);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    // 2x2 Plane covering the entire Orthographic camera
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      targetMouse.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height // Flip Y for WebGL
      };
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      uniforms.u_time.value = clock.getElapsedTime();
      
      // Smooth interpolation for elegant parallax
      currentMouse.current.x += (targetMouse.current.x - currentMouse.current.x) * 0.05;
      currentMouse.current.y += (targetMouse.current.y - currentMouse.current.y) * 0.05;
      uniforms.u_mouse.value.set(currentMouse.current.x, currentMouse.current.y);

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
  }, [speed, panelCount, color1, color2, color3, color4, interactive]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#0a001a] ${className}`}>
      {/* Background WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Gradient Overlay for improved text legibility */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none" 
        style={{ 
          background: 'linear-gradient(to bottom, rgba(10, 0, 26, 0.4) 0%, transparent 20%, transparent 80%, rgba(10, 0, 26, 0.6) 100%)' 
        }} 
      />
      
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
    <PrismaticPanelsBackground speed={0.6} panelCount={8.0}>
    
    </PrismaticPanelsBackground>
  );
}