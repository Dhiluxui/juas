import React, { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';

export interface PrismaticGlassProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Background Void Color */
  colorBg?: string;
  /* @title Midtone Shadow Color */
  colorDark?: string;
  /* @title Neon Highlight Color */
  colorLight?: string;
  /* @title Overlay Content */
  children?: ReactNode;
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

export const CosmicCometBackground = ({
  speed = 1.0,
  colorBg = '#0B001A',    // Deep void purple
  colorDark = '#5A00FF',  // Mid-tone indigo/purple
  colorLight = '#FF00FF', // Bright pink/magenta highlights
  children,
  className = '',
}: PrismaticGlassProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const targetMouseRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });

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
      u_colorBg: { value: hexToRgbVec3(colorBg) },
      u_colorDark: { value: hexToRgbVec3(colorDark) },
      u_colorLight: { value: hexToRgbVec3(colorLight) },
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
      
      uniform vec3 u_colorBg;
      uniform vec3 u_colorDark;
      uniform vec3 u_colorLight;

      #define PI 3.14159265359

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // 2D Hash function for randomizing shards
      float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      void main() {
          // Normalize coordinates and fix aspect ratio
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
          
          float time = u_time * u_speed * 0.1;

          // Mouse Parallax Offset
          vec2 center = u_mouse * 0.05;
          vec2 p = uv - center;
          
          // Background Gradient (Deep void in the center, slightly lighter edges)
          float distToCenter = length(p);
          vec3 bgCol = mix(u_colorBg * 0.1, u_colorBg, smoothstep(0.0, 1.0, distToCenter));
          
          vec3 finalColor = bgCol;

          // ==========================================
          // 3D GEOMETRIC SHARD GENERATOR
          // ==========================================
          // We render multiple layers back-to-front. 
          // For each layer, we divide space into radial slices (pie pieces).
          // Inside each slice, we render a mathematical V-shape with 3D shading.
          
          const float numLayers = 8.0;
          
          for(float i = numLayers; i >= 1.0; i -= 1.0) {
              // Z-depth of the current layer (1.0 is back, 0.0 is front)
              float layerZ = i / numLayers; 
              
              // Rotate each layer in opposite directions slowly
              float dir = mod(i, 2.0) == 0.0 ? 1.0 : -1.0;
              float layerAngle = time * (0.5 + layerZ) * dir + (i * 2.33);
              
              // Add slight mouse rotation for 3D parallax
              layerAngle += u_mouse.x * 0.2 * (1.0 - layerZ);
              
              vec2 rp = p * rot(layerAngle);
              float angle = atan(rp.y, rp.x);
              float r = length(rp);
              
              // Determine how many shards are in this layer
              float numSegments = 5.0 + i * 3.0; // More segments in the background
              float segAngle = (2.0 * PI) / numSegments;
              
              // Identify which segment we are in
              float segId = floor(angle / segAngle);
              // Localize the angle to the center of the segment
              float localAngle = mod(angle, segAngle) - (segAngle / 2.0);
              
              // Convert back to cartesian coordinates local to the shard
              // Now, every shard points perfectly along the positive X-axis
              vec2 lp = vec2(r * cos(localAngle), r * sin(localAngle));
              
              // Generate random seeds for this specific shard
              vec2 seed = vec2(segId, i);
              float h1 = hash21(seed);
              float h2 = hash21(seed + 1.0);
              float h3 = hash21(seed + 2.0);
              
              // Randomly skip some shards to create empty gaps
              if (h1 < 0.45) continue;
              
              // --- SHARD GEOMETRY PARAMETERS ---
              // Where does the shard start? (Distance from center)
              float startRadius = 0.1 + (layerZ * 0.2) + (h2 * 0.3);
              
              // How long is it?
              float maxLength = 1.0 + h1 * 1.5;
              
              // How thick does it get?
              float widthSlope = 0.04 + (h3 * 0.08); 
              
              // Optimization: Only compute if we are within the length bounds
              if (lp.x > startRadius && lp.x < maxLength) {
                  
                  // Calculate the exact half-width of the crystal at this X coordinate
                  float halfWidth = (lp.x - startRadius) * widthSlope;
                  
                  // Normalize Y to range [-1.0, 1.0] across the width of the crystal
                  float ny = lp.y / halfWidth;
                  
                  // If we are inside the V-shape...
                  if (abs(ny) <= 1.0) {
                      
                      // --- 3D LIGHTING & MATERIAL ---
                      // Divide the wedge into a Left Face (ny < 0) and Right Face (ny > 0)
                      bool isLitFace = ny > 0.0;
                      
                      // Base Colors
                      vec3 shadowBase = mix(u_colorBg, u_colorDark, 0.2); // Very dark
                      vec3 litBase = u_colorDark * (0.8 + h1 * 0.4);      // Mid purple
                      
                      vec3 col = isLitFace ? litBase : shadowBase;
                      
                      // Anisotropic Shading (Gradient across the face)
                      if (isLitFace) {
                          // Brightens towards the outer edge
                          col = mix(col, u_colorLight * 0.8, pow(ny, 1.5) * 0.7);
                      } else {
                          // Subtle ambient light on the dark face
                          col = mix(col, u_colorDark * 0.5, pow(abs(ny), 2.0) * 0.3);
                      }
                      
                      // --- SPECULAR HIGHLIGHTS ---
                      // 1. The Ridge (Center line where the two faces meet)
                      float ridge = smoothstep(0.08, 0.0, abs(ny));
                      
                      // 2. The Edge (Outer boundary of the crystal)
                      float edge = smoothstep(0.9, 1.0, abs(ny));
                      
                      vec3 highlight = mix(u_colorLight, vec3(1.0, 0.8, 1.0), h2); // Magenta to White
                      
                      // Apply intense glow to the ridge (mostly on the lit face)
                      col += highlight * ridge * (isLitFace ? 2.0 : 0.4);
                      
                      // Apply glow to the outer edges
                      col += highlight * edge * 1.5 * (0.5 + h3 * 0.5);
                      
                      // Specular Glint (A bright spot near the inner tip)
                      float glint = smoothstep(startRadius + 0.4, startRadius, lp.x) * ridge;
                      col += vec3(1.0) * glint * (isLitFace ? 2.5 : 0.0);
                      
                      // --- FADING & BLENDING ---
                      // Fade out sharply at the inner tip to blend into the void
                      float tipFade = smoothstep(startRadius, startRadius + 0.08, lp.x);
                      col *= tipFade;
                      
                      // Fade out smoothly at the outer tail
                      float tailFade = smoothstep(maxLength, maxLength - 0.3, lp.x);
                      col *= tailFade;
                      
                      // Atmospheric perspective (fog) - background layers are darker
                      col *= mix(1.0, 0.15, layerZ);
                      
                      // Anti-aliasing mask for sharp edges
                      // Pixel width relative to radius to keep edges sharp at all zoom levels
                      float aa = 0.015 / max(0.1, r); 
                      float mask = smoothstep(1.0, 1.0 - aa, abs(ny));
                      
                      // Blend this shard over the background
                      finalColor = mix(finalColor, col, mask);
                  }
              }
          }
          
          // ==========================================
          // POST PROCESSING
          // ==========================================
          // Vignette to darken corners
          finalColor *= smoothstep(1.5, 0.2, distToCenter);
          
          // Enforce pure dark center void
          finalColor *= smoothstep(0.02, 0.15, distToCenter);
          
          // S-Curve Contrast (Makes highlights pop and crushes blacks)
          finalColor = smoothstep(0.0, 1.0, finalColor);
          finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);

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
      
      // Smoothly interpolate mouse position for a heavy, premium parallax feel
      mouseRef.current.lerp(targetMouseRef.current, 0.05);
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
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
      // Map to -1 to 1
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

  // Sync Dynamic Props (Zero GPU Cost)
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_colorBg.value = hexToRgbVec3(colorBg);
      uniformsRef.current.u_colorDark.value = hexToRgbVec3(colorDark);
      uniformsRef.current.u_colorLight.value = hexToRgbVec3(colorLight);
    }
  }, [speed, colorBg, colorDark, colorLight]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#05000A] font-sans ${className}`}>
      {/* Three.js Canvas Mount */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 z-0 pointer-events-none" 
      />
    
    </div>
  );
};

export default CosmicCometBackground;