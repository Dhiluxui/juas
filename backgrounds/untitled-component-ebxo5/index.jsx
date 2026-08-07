import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, ArrowRight, Activity, Cpu, Network } from 'lucide-react';

// Utility to convert hex to normalized RGB for GLSL
const hexToRgbVec3 = (hex) => {
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

export const RibbedVelocityBackground = ({
  speed = 1.0,
  color1 = '#090014', // Deep, almost black purple
  color2 = '#4B00B3', // Rich velvet purple
  color3 = '#B366FF', // Bright neon magenta/purple
  ribDensity = 45.0,
  children,
  className = '',
}) => {
  const mountRef = useRef(null);
  const uniformsRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false,
      powerPreference: 'high-performance' 
    });

    // Cap pixel ratio to ensure smooth performance on heavy fragment shaders
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
      u_speed: { value: speed },
      u_ribDensity: { value: ribDensity },
      u_color1: { value: hexToRgbVec3(color1) },
      u_color2: { value: hexToRgbVec3(color2) },
      u_color3: { value: hexToRgbVec3(color3) },
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
      uniform float u_ribDensity;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // High-frequency noise for film grain
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          // Normalize and adjust for aspect ratio
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          // Gentle mouse parallax
      vec2 mouse = u_mouse * 0.15;
      p -= mouse;

      // Rotate to match the dynamic diagonal flow of the reference
      p *= rot(-0.55); // Slightly shallower angle
      // Shift composition more to the bottom and right
      p.x -= 0.8; 
      p.y += 1.0; 

      float t = u_time * u_speed * 0.4;
      
      // Base void background
      vec3 finalColor = u_color1 * 0.2; 
      
      // Global light direction for the 3D tube effect
      vec3 lightDir = normalize(vec3(0.3, 0.7, 1.0));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 halfVector = normalize(lightDir + viewDir);

      // Render multiple sweeping layers (Back to Front)
      for(float i = 1.0; i <= 5.0; i++) {
          
          // ==========================================
          // 1. LAYER CURVATURE MATH
          // ==========================================
          // Create broader, sweeping curved boundaries for a more elegant flow
          float freq1 = 0.4 + i * 0.1;
          float freq2 = 0.7 - i * 0.08;
          
          float wave = sin(p.x * freq1 + t + i * 1.5) * 0.5;
          wave += cos(p.x * freq2 - t * 0.8 + i * 2.2) * 0.25;
          
          // Space layers vertically and push them lower
          float layerOffset = i * 1.1 - 4.0; 
          
          // Calculate distance from the curved boundary
          // Positive means "inside" the layer, Negative means "outside"
          float dist = p.y - wave - layerOffset;

          // ==========================================
          // 2. DROP SHADOWS & BLENDING
          // ==========================================
          float layerMask = smoothstep(0.0, 0.015, dist);
          float shadow = smoothstep(-0.4, 0.0, dist);
          finalColor *= mix(0.15, 1.0, shadow); 
          
          // ==========================================
          // 3. 3D CYLINDRICAL RIB GENERATION
          // ==========================================
          float currentDensity = u_ribDensity + i * 3.0;
          float ribPhase = fract(dist * currentDensity - t * 3.0);
          
          float nx = ribPhase * 2.0 - 1.0;
          float nz = sqrt(max(1.0 - nx * nx, 0.0));
          
          vec3 normal = normalize(vec3(nx, p.x * 0.15, nz));
          
          // ==========================================
          // 4. PHYSICAL LIGHTING MODEL
          // ==========================================
          float diffuse = max(dot(normal, lightDir), 0.0);
          float specular = pow(max(dot(normal, halfVector), 0.0), 48.0);
          
          vec3 layerBase = mix(u_color1, u_color2, 0.1 + i * 0.18);
          vec3 layerMid = mix(layerBase, u_color3, 0.2);
          
          vec3 ribColor = mix(layerBase, layerMid, diffuse);
              ribColor += u_color3 * specular * 1.5; 
              
              // ==========================================
              // 5. EDGE RIM LIGHTING
              // ==========================================
              float edgeRim = exp(-dist * 25.0);
              ribColor += mix(u_color3, vec3(1.0), 0.5) * edgeRim * 0.8;
              
              finalColor = mix(finalColor, ribColor, layerMask);
          }

          // ==========================================
          // 6. CINEMATIC POST-PROCESSING
          // ==========================================
          float vignette = length(uv - 0.5);
          finalColor *= smoothstep(0.9, 0.1, vignette);

          // ACES Film Tonemapping
          finalColor = clamp((finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14), 0.0, 1.0);

          float grain = hash(uv * 150.0 + t);
          finalColor += (grain - 0.5) * 0.05;

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

    // 3. Animation & Interaction Loop
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Lerp mouse for that heavy, high-quality inertia feel
      mouseRef.current.lerp(targetMouseRef.current, 0.04);
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

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // WebGL uses inverted Y
      
      // Map to -1 to 1 range
      targetMouseRef.current.set((x - 0.5) * 2.0, (y - 0.5) * 2.0);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);

    // Cleanup
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

  // Graceful prop syncing without rebuilding context
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_ribDensity.value = ribDensity;
      uniformsRef.current.u_color1.value = hexToRgbVec3(color1);
      uniformsRef.current.u_color2.value = hexToRgbVec3(color2);
      uniformsRef.current.u_color3.value = hexToRgbVec3(color3);
    }
  }, [speed, ribDensity, color1, color2, color3]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#090014] font-sans ${className}`}>
      {/* 3D Canvas Background */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Foreground Content */}
      {children && (
        <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-center items-center">
          <div className="pointer-events-auto w-full h-full">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};


export default function App() {
  const [speed, setSpeed] = useState(1.0);
  
  return (
    <RibbedVelocityBackground 
      speed={speed}
      color1="#090014"
      color2="#4B00B3"
      color3="#B366FF"
      ribDensity={50.0}
    >
    </RibbedVelocityBackground>
  );
}