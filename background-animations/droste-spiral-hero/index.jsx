import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EmeraldAuroraMeshBackgroundProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Background Void Color */
  colorBg?: string;
  /* @title Mid-tone Glow Color */
  colorMid?: string;
  /* @title Core Neon Line Color */
  colorCore?: string;
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

export const EmeraldAuroraMeshBackground = ({
  speed = 1.0,
  colorBg = '#000501',   // Pitch black / ultra-deep green
  colorMid = '#0a8f24',  // Ambient Neon Green Glow
  colorCore = '#33ff00', // Searing hot pure green line
  children,
  className = '',
}: EmeraldAuroraMeshBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const targetMouseRef = useRef(new THREE.Vector2(0, 0));

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

    // Cap pixel ratio to ensure 60fps on high-res displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
      u_speed: { value: speed },
      u_colorBg: { value: hexToRgbVec3(colorBg) },
      u_colorMid: { value: hexToRgbVec3(colorMid) },
      u_colorCore: { value: hexToRgbVec3(colorCore) },
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
      uniform vec3 u_colorMid;
      uniform vec3 u_colorCore;

      void main() {
          // Normalized coordinates (0 to 1) for gradients
          vec2 normUV = gl_FragCoord.xy / u_resolution.xy;
          
          // Aspect-corrected coordinates for square grid cells
          vec2 uv = gl_FragCoord.xy / u_resolution.y;
          
          float t = u_time * u_speed * 0.4;
          
          // ==========================================
          // ANALOG DISTORTION (Wobble)
          // ==========================================
          // Apply subtle, slow-moving sine waves to the coordinates to mimic
          // imperfections in an analog CRT monitor or a hand-drawn look.
          float wobbleX = sin(uv.y * 8.0 + t) * 0.008 + cos(uv.y * 3.0 - t * 0.5) * 0.005;
          float wobbleY = cos(uv.x * 8.0 - t) * 0.008 + sin(uv.x * 3.0 + t * 0.5) * 0.005;
          
          vec2 distortedUV = uv + vec2(wobbleX, wobbleY);
          
          // Add a slow, constant downward pan to the grid
          distortedUV.y -= t * 0.3;

          // ==========================================
          // GRID GENERATION
          // ==========================================
          // Scale the UVs to determine how many squares fit vertically
          float gridSize = 7.0; 
          vec2 scaledUV = distortedUV * gridSize;
          
          // fract() splits the space into a repeating 0.0-1.0 grid
          vec2 cell = fract(scaledUV);
          
          // Calculate distance from the current pixel to the nearest cell edge
          // min(cell, 1.0 - cell) gives a value of 0 at the edges and 0.5 at the center
          vec2 distToEdge = min(cell, 1.0 - cell);
          
          // The distance to the closest line (either horizontal or vertical)
          float lineDist = min(distToEdge.x, distToEdge.y);

          // ==========================================
          // LIGHTING & BLOOM
          // ==========================================
          // Vertical Fade: 1.0 at the bottom, 0.0 at the top.
          // We use pow() to make the fade curve exponential, keeping the top very dark.
          float yFade = pow(1.0 - normUV.y, 2.5);
          
          // Minimum ambient brightness so the top lines aren't 100% invisible
          float intensityMult = max(yFade * 2.5, 0.05);

          // Core sharp wireframe line
          // exp() creates a beautiful, natural optical falloff
          float coreLine = exp(-lineDist * 180.0) * intensityMult;
          
          // Wide, soft ambient neon glow surrounding the lines
          float softGlow = exp(-lineDist * 30.0) * intensityMult * 0.6;
          
          // A global puddle of light resting at the bottom of the screen
          float ambientBaseGlow = exp(-normUV.y * 4.0) * 0.25;

          // ==========================================
          // COLOR MIXING
          // ==========================================
          vec3 finalColor = u_colorBg;
          
          // Add the wide soft glow
          finalColor += u_colorMid * softGlow;
          // Add the sharp hot core
          finalColor += u_colorCore * coreLine;
          // Add the global bottom glow
          finalColor += u_colorMid * ambientBaseGlow;

          // ==========================================
          // POST-PROCESSING
          // ==========================================
          // Subtle high-frequency film grain to prevent color banding
          float grain = fract(sin(dot(normUV, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
          finalColor += (grain - 0.5) * 0.04;

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
      
      // Smooth mouse interpolation (lerp) for fluid, heavy feeling interaction
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
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
      // Map to -1 to 1 space
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

  // Safely sync dynamic props without rebuilding WebGL context
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_colorBg.value = hexToRgbVec3(colorBg);
      uniformsRef.current.u_colorMid.value = hexToRgbVec3(colorMid);
      uniformsRef.current.u_colorCore.value = hexToRgbVec3(colorCore);
    }
  }, [speed, colorBg, colorMid, colorCore]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000501] font-sans ${className}`}>
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
    </div>
  );
};

export default EmeraldAuroraMeshBackground;