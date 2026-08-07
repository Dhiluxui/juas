import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface NeonHorizonProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Core Glow Color (Bottom) */
  colorCore?: string;
  /* @title Mid Glow Color */
  colorMid?: string;
  /* @title Outer Aura Color */
  colorOuter?: string;
  /* @title Overlay Content */
  children?: React.ReactNode;
  /* @title Extra CSS Classes */
  className?: string;
}

export const NeonHorizonBackground = ({
  speed = 1.0,
  colorCore = '#FFFFFF',  // Pure white/hot core
  colorMid = '#8800FF',   // Vibrant Electric Purple
  colorOuter = '#1A0033', // Deep Space Purple
  children,
  className = '',
}: NeonHorizonProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseCurrent = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    
    // Orthographic camera bounds exactly to the -1 to 1 UV space
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false,
      powerPreference: 'high-performance' 
    });
    
    // Cap pixel ratio for performance while maintaining smooth gradients
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const updateSize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      return { width, height };
    };

    const { width, height } = updateSize();
    container.appendChild(renderer.domElement);

    // Utility to convert hex strings to THREE.Vector3 RGB values for shaders
    const hexToVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_colorCore: { value: hexToVec3(colorCore) },
      u_colorMid: { value: hexToVec3(colorMid) },
      u_colorOuter: { value: hexToVec3(colorOuter) },
    };
    
    uniformsRef.current = uniforms;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // This shader recreates the smooth, bloomy look of the reference image
    // by using additive exponential decay curves (exp(-x)) to simulate volumetric light.
    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      
      uniform vec3 u_colorCore;
      uniform vec3 u_colorMid;
      uniform vec3 u_colorOuter;

      // Simple 2D Hash for Film Grain
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          // Normalize pixel coordinates (0 to 1)
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          float t = u_time * u_speed * 0.5;

          // --- MOUSE INTERACTION (Magnetic pull) ---
          // Calculate distance from mouse, squashing the Y axis to create a wide "push"
          float mouseDist = length(vec2(uv.x - u_mouse.x, (uv.y - u_mouse.y) * 2.0));
          // Add a localized upward bulge where the mouse is
          float mouseWarp = exp(-mouseDist * 8.0) * 0.1;

          // --- DOMAIN WARPING (The organic aurora wave motion) ---
          // Combine multiple low-frequency sine waves to create smooth, broad lobes of light
          float wave = sin(uv.x * 3.5 + t) * 0.15 
                     + cos(uv.x * 2.0 - t * 0.8) * 0.15
                     + sin(uv.x * 6.0 + t * 1.5) * 0.05;

          // Apply the warp to the vertical coordinate.
          // Shift the baseline up slightly to thicken the core
          float y = uv.y - wave - mouseWarp - 0.05;
          
          // Clamp Y to prevent negative values from causing the exp() function to blow up to infinity
          y = max(0.0, y);

          // --- ADDITIVE EXPONENTIAL DECAY (Volumetric Light Simulation) ---
          // We build the light from the outside in, adding layers of color.
          // The exp() function beautifully simulates how light energy dissipates over distance.
          
          vec3 finalColor = vec3(0.0);
          
          // 1. The deep, dark outer aura (reaches furthest)
          // Significantly decreased decay multiplier to push the light much higher up the screen
          finalColor += u_colorOuter * exp(-y * 1.2);
          
          // 2. The vibrant, saturated middle body
          // Decreased decay multiplier to stretch the mid-tones further up
          finalColor += u_colorMid * exp(-y * 2.5);
          
          // 3. The intense, hot core at the very bottom edge
          // Decreased decay multiplier to drastically widen the bright white base
          finalColor += u_colorCore * exp(-y * 5.0);

          // --- POST-PROCESSING ---
          
          // Darken the upper corners to create a vignette effect focusing the light center-bottom
          float vignette = smoothstep(1.5, 0.2, length(uv - vec2(0.5, 0.0)));
          finalColor *= vignette;

          // Smoothstep contrast to make the brights pop and crush the deepest blacks
          finalColor = smoothstep(0.0, 1.0, finalColor);

          // Add a subtle dither / film grain. 
          // This is CRITICAL to prevent color banding in smooth, dark gradients.
          finalColor += (hash(uv + u_time) - 0.5) * 0.035;

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

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      // Calculate normalized mouse coordinates (0 to 1)
      const x = (event.clientX - rect.left) / rect.width;
      // Invert Y so 0 is bottom, matching WebGL coords
      const y = 1.0 - ((event.clientY - rect.top) / rect.height);
      
      mouseTarget.current.set(x, y);
    };

    container.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Interpolate mouse movement for buttery smooth, delayed liquid reactions
      mouseCurrent.current.lerp(mouseTarget.current, 0.05);
      uniforms.u_mouse.value.copy(mouseCurrent.current);

      uniforms.u_time.value = clock.getElapsedTime();
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
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []); // Empty dependency array ensures Three.js only mounts once

  // Sync props to uniforms without re-mounting the canvas
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_colorCore.value = new THREE.Color(colorCore);
      uniformsRef.current.u_colorMid.value = new THREE.Color(colorMid);
      uniformsRef.current.u_colorOuter.value = new THREE.Color(colorOuter);
    }
  }, [speed, colorCore, colorMid, colorOuter]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black font-sans ${className}`}>
      {/* 2D WebGL Canvas Layer */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 z-0 pointer-events-auto" 
      />

    </div>
  );
};

export default NeonHorizonBackground;