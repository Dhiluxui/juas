import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * BlueSilkBackground
 * A luxurious WebGL motion background that renders smooth, flowing silk folds.
 * Recreates the specific aesthetic of soft, continuous fabric undulating 
 * with broad specular highlights and deep shadow crevices.
 */
export default function BlueSilkBackground({
  speed = 0.5,
  colorShadow = '#001a4d', // Deep navy for the crevices
  colorMidtone = '#0055ff', // Rich blue for the main fabric body
  colorHighlight = '#00ccff', // Bright cyan for the specular peaks
  className = '',
  children,
}) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, and Renderer Setup
    const scene = new THREE.Scene();
    
    // Orthographic camera is ideal for full-screen 2D shaders
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    // Cap pixel ratio to ensure smooth 60fps performance on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Helper to safely convert hex strings to THREE.Vector3 RGB values for the shader
    const parseColor = (hex) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_speed: { value: speed },
      u_colorShadow: { value: parseColor(colorShadow) },
      u_colorMidtone: { value: parseColor(colorMidtone) },
      u_colorHighlight: { value: parseColor(colorHighlight) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // The core fragment shader that generates the smooth, silky folds
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      
      uniform vec3 u_colorShadow;
      uniform vec3 u_colorMidtone;
      uniform vec3 u_colorHighlight;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
          // Normalize coordinates and adjust for aspect ratio
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          float t = u_time * u_speed * 0.5; // Smooth, slow motion

          // --- DOMAIN WARPING FOR SILK FOLDS ---
          
          // 1. Rotate the UV space diagonally to match the reference video
          // The video has lines running roughly top-left to bottom-right
          p *= rot(0.7); 
          
          // 2. Add subtle, low-frequency warping to make the folds organic
          // We use sine waves on the Y axis to bend the X coordinates smoothly
          float warp1 = sin(p.y * 1.5 + t) * 0.3;
          float warp2 = cos(p.y * 0.8 - t * 0.8) * 0.2;
          p.x += warp1 + warp2;

          // --- SHAPE GENERATION ---
          
          // Generate the primary folds using a combination of sine waves
          // We use multiple overlapping frequencies to create major and minor folds
          float fold = sin(p.x * 3.5 + t * 1.2);
          fold += sin(p.x * 2.2 - t * 0.6) * 0.5;
          
          // Normalize the fold value to roughly a 0.0 to 1.0 range
          fold = fold * 0.5 + 0.5;

          // --- SHADING & LIGHTING (THE FABRIC MATERIAL) ---
          
          // Base color: mix between deep crevices (shadow) and the fabric body (midtone)
          // We use a smoothstep to broaden the midtones
          float bodyMask = smoothstep(0.1, 0.85, fold);
          vec3 finalColor = mix(u_colorShadow, u_colorMidtone, bodyMask);
          
          // Specular Highlight: The shiny crest of the silk folds
          // Using a power function creates a glossy sheen. A lower power (like 2.0-3.0) 
          // keeps it broad and soft like satin/silk, unlike the sharp laser of the kinetic shaders.
          float specular = pow(smoothstep(0.5, 1.0, fold), 2.5);
          finalColor = mix(finalColor, u_colorHighlight, specular * 0.9);

          // Secondary Rim Light / Reflection in the valleys
          // Silk often has internal reflections in the shadows
          float rim = pow(smoothstep(0.4, 0.0, fold), 2.0);
          finalColor += u_colorMidtone * rim * 0.3;

          // --- POST PROCESSING ---
          
          // Subtle Vignette to give depth to the corners
          float dist = length(uv - 0.5);
          finalColor *= smoothstep(1.0, 0.3, dist) * 0.4 + 0.6; 
          
          // Slight contrast bump to make the blues pop
          finalColor = smoothstep(0.0, 1.0, finalColor);

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

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, colorShadow, colorMidtone, colorHighlight]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#00081a] ${className}`}>
      {/* WebGL Canvas Background */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />
      
      {/* Overlay Content Slot */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}