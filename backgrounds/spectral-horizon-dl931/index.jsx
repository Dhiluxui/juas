import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface SpectralHorizonProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

export const SpectralHorizonBackground = ({
  speed = 1.0,
  children,
  className = '',
}: SpectralHorizonProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    
    // Orthographic camera is perfect for 2D flat shaders mapping exactly to the screen
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio at 2 for optimal performance while maintaining retina sharpness
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    
    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed }
    };

    // Target mouse for smooth lerping
    const targetMouse = new THREE.Vector2(0.5, 0.5);

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

      // Generates a rich, vibrant spectral color palette (Red -> Orange -> Yellow -> White -> Blue)
      vec3 getSpectralColor(float t) {
          t = fract(t);
          vec3 c1 = vec3(0.95, 0.05, 0.0);  // Deep Crimson Red
          vec3 c2 = vec3(1.0, 0.35, 0.0);   // Fiery Orange
          vec3 c3 = vec3(1.0, 0.8, 0.0);    // Bright Yellow
          vec3 c4 = vec3(1.0, 0.95, 1.0);   // Core White
          vec3 c5 = vec3(0.0, 0.5, 1.0);    // Electric Blue
          vec3 c6 = vec3(0.0, 0.05, 0.7);   // Deep Void Blue
          
          float s = 1.0 / 5.0; // 5 segments
          
          if(t < s) return mix(c1, c2, smoothstep(0.0, 1.0, t / s));
          if(t < 2.0 * s) return mix(c2, c3, smoothstep(0.0, 1.0, (t - s) / s));
          if(t < 3.0 * s) return mix(c3, c4, smoothstep(0.0, 1.0, (t - 2.0 * s) / s));
          if(t < 4.0 * s) return mix(c4, c5, smoothstep(0.0, 1.0, (t - 3.0 * s) / s));
          return mix(c5, c6, smoothstep(0.0, 1.0, (t - 4.0 * s) / s));
      }

      void main() {
          // Normalize pixel coordinates and fix aspect ratio
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          // Interactive Horizon Tilting
          vec2 m = u_mouse * 2.0 - 1.0;
          float tilt = m.x * 0.15;
          float s_rot = sin(tilt), c_rot = cos(tilt);
          p = mat2(c_rot, -s_rot, s_rot, c_rot) * p;

          float t = u_time * 0.15 * u_speed;
          
          // --- 1. DOMAIN WARPING (X-Axis) ---
          // Creates organic, shifting lateral movement
          float warpX = p.x * 0.7;
          warpX += sin(warpX * 2.5 + t) * 0.15;
          warpX += sin(warpX * 5.0 - t * 0.8) * 0.05;

          // --- 2. THE DISCRETE PILLAR EFFECT ---
          // We break the continuous X coordinate into discrete "blocks" or "pillars"
          // This perfectly mimics the reference image's distinct vertical bands
          float pillarScale = 5.0; // Number of distinct bands
          float pillarIndex = floor(warpX * pillarScale);
          float pillarFract = fract(warpX * pillarScale);
          
          // Smooth the transition between pillars so it's not a harsh pixelated line
          float pillarBlend = smoothstep(0.1, 0.9, pillarFract);
          float steppedX = (pillarIndex + pillarBlend) / pillarScale;

          // Generate the base color using the stepped X coordinate
          vec3 baseColor = getSpectralColor(steppedX + t * 0.1 + 0.35);

          // --- 3. THE HORIZON LINE ---
          // Add a slight sweeping, breathing curve to the center axis
          float hLine = p.y + sin(warpX * 2.0 - t * 0.5) * 0.04;
          float hDist = abs(hLine);

          // --- 4. VOLUMETRIC BLOOM MASK ---
          // Different pillars have different bloom heights/intensities
          // We use a pseudo-random value based on the pillarIndex
          float pillarHeightMod = sin(pillarIndex * 43.123 + t * 1.5) * 0.5 + 0.5;
          // Calculate how tightly the light clings to the horizon (higher bleed = tighter)
          float bleed = mix(3.0, 15.0, pillarHeightMod); 
          
          // The main vertical light bleed
          float verticalBloom = exp(-hDist * bleed);
          
          // --- 5. THE RAZOR EDGE ---
          // The intense, blindingly white line at the exact center
          float razorEdge = exp(-hDist * 250.0);

          // --- COMPOSITION ---
          vec3 finalColor = vec3(0.005, 0.005, 0.015); // Deep Void Background
          
          // Add the colored volumetric pillars
          finalColor += baseColor * verticalBloom * 1.6;
          
          // Add the super-bright central core
          finalColor += vec3(1.0, 0.95, 0.9) * razorEdge * 1.5;
          
          // Add secondary horizontal streaks/flares for extra detail
          float streaks = abs(sin(warpX * 30.0)) * exp(-hDist * 25.0);
          finalColor += baseColor * streaks * 0.4;

          // --- POST-PROCESSING ---
          // Radial Vignette to draw focus to the center
          float vignette = length(uv - 0.5);
          finalColor *= smoothstep(0.85, 0.15, vignette);
          
          // Premium Film Grain
          float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          finalColor += grain * 0.025;
          
          // Cinematic Tone Mapping & Contrast
          finalColor = pow(finalColor, vec3(1.15)); 

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
      const rect = container.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = 1.0 - (e.clientY - rect.top) / rect.height; // Invert Y for WebGL
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update Uniforms
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_speed.value = speed;
      
      // Smoothly lerp mouse position for silky interactions
      uniforms.u_mouse.value.lerp(targetMouse, 0.05);

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
      window.removeEventListener('mousemove', handleMouseMove);
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
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000000] font-sans ${className}`}>
      
      {/* Three.js Canvas Background Layer */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />
      
      {/* Subtle darkening gradient to ensure text readability */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none" 
        style={{ 
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.7) 100%)' 
        }} 
      />
      
      {/* Foreground Content Overlay */}
      {children && (
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
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
    <div className="w-screen h-screen">
      <SpectralHorizonBackground speed={1.0}>
        
        {/* Example Hero Content */}
       
      </SpectralHorizonBackground>
    </div>
  );
}