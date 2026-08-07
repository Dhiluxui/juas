import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface LayeredWavesBackgroundProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Deepest Shadow Color (Bottom Left) */
  color1?: string;
  /* @title Vibrant Mid Color */
  color2?: string;
  /* @title Soft Light Color */
  color3?: string;
  /* @title Brightest Highlight Color (Top Right) */
  color4?: string;
  /* @title Number of Waves/Layers */
  bandsCount?: number;
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

export const LayeredWavesBackground = ({
  speed = 1.0,
  color1 = '#0B0B2A', // Deep Indigo/Black
  color2 = '#0044FF', // Vibrant Royal Blue
  color3 = '#8A77FF', // Soft Violet (Tweaked to match reference images)
  color4 = '#FFDDF4', // Glowing Pink/White
  bandsCount = 12.0,
  children,
  className = '',
}: LayeredWavesBackgroundProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Setup Scene, Camera, Renderer
    // We use a 2D Orthographic camera because the "3D" is entirely simulated in the shader math.
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
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_bandsCount: { value: bandsCount },
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

    // Completely rewritten fragment shader to match the overlapping 3D S-curves of the reference images
    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_bandsCount;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_color4;

      // High-frequency hash function for cinematic film grain
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          // Normalize pixel coordinates
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          
          // Aspect ratio correction for the distortion math
          vec2 p = uv;
          p.x *= u_resolution.x / u_resolution.y;
          
          float t = u_time * 0.15 * u_speed;
          
          // Gentle mouse parallax to make the layers feel physical
          vec2 mouseOffset = (u_mouse - 0.5) * 0.15;
          p += mouseOffset;
          
          // ==========================================
          // 1. KINETIC DOMAIN WARPING (S-Curves)
          // ==========================================
          vec2 q = p;
          
          // Primary small folds
          q.x += sin(q.y * 3.0 + t) * 0.15;
          q.y += cos(q.x * 3.0 - t * 0.8) * 0.15;
          
          // Secondary massive swoops for overall layout
          q.x += sin(q.y * 1.5 - t * 0.5) * 0.2;
          
          // ==========================================
          // 2. LAYER METRIC (The 3D Illusion)
          // ==========================================
          // A diagonal progression from bottom-left to top-right
          float metric = (q.x + q.y) * u_bandsCount * 0.8;
          
          // fract() splits the metric into repeating bands (0.0 to 1.0)
          float bandPos = fract(metric);
          
          // ==========================================
          // 3. IN-BAND SHADING (Highlights & Drop Shadows)
          // ==========================================
          // We apply anti-aliasing to the sharp edge where bandPos loops from 1.0 to 0.0
          float edgeWidth = 0.04;
          float edge = smoothstep(0.0, edgeWidth, bandPos);
          
          // Create the inner shading curve (deep shadow transitioning to a bright rim)
          float shadowCurve = pow(bandPos, 1.4); 
          float shading = mix(0.15, 1.2, shadowCurve);
          
          // Blend the sharp edge: smooth transition from the previous band's bright rim (1.2) 
          // to the current band's deep shadow
          float finalShading = mix(1.2, shading, edge);
          
          // ==========================================
          // 4. GLOBAL COLOR GRADIENT
          // ==========================================
          // The gradient is anchored to the screen space (uv), not the warped space (q)
          float gradPos = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
          
          // Blend the 4-color palette smoothly
          vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 0.4, gradPos));
          color = mix(color, u_color3, smoothstep(0.3, 0.7, gradPos));
          color = mix(color, u_color4, smoothstep(0.6, 1.0, gradPos));

          // Apply the 3D shading layer to the global gradient
          vec3 finalColor = color * finalShading;

          // ==========================================
          // 5. POST-PROCESSING
          // ==========================================
          // Add cinematic high-frequency film grain to break banding and add texture
          float grain = (hash(uv * 100.0 + u_time) - 0.5) * 0.05;
          finalColor += grain;
          
          // Apply ACES-like tonemapping for richer contrast and blowout protection
          finalColor = clamp((finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14), 0.0, 1.0);

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

    // 3. Animation Loop & Cleanup
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Smoothly interpolate mouse position for a fluid, heavy interaction feel
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
      uniformsRef.current.u_bandsCount.value = bandsCount;
      uniformsRef.current.u_color1.value = hexToRgbVec3(color1);
      uniformsRef.current.u_color2.value = hexToRgbVec3(color2);
      uniformsRef.current.u_color3.value = hexToRgbVec3(color3);
      uniformsRef.current.u_color4.value = hexToRgbVec3(color4);
    }
  }, [speed, bandsCount, color1, color2, color3, color4]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#0B0B2A] font-sans ${className}`}>
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
    </div>
  );
};

export default LayeredWavesBackground;