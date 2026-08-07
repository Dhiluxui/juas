import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface LiquidSatinProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Deep Shadow Color */
  colorDark?: string;
  /** @title Mid-tone Fabric Color */
  colorMid?: string;
  /** @title Glossy Highlight Color */
  colorLight?: string;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export default function LiquidSatin({
  speed = 0.4,
  colorDark = '#000a1f',  // Deep, almost black navy for crevices
  colorMid = '#0044cc',   // Rich medium blue for the body
  colorLight = '#00ccff', // Bright electric cyan for the light cast
  children,
  className = '',
}: LiquidSatinProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Utility: Convert Hex to WebGL-friendly RGB vectors
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
        : new THREE.Vector3(0.0, 0.0, 0.0);
    };

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shaders
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_speed: { value: speed },
      u_colorDark: { value: hexToRgbVec3(colorDark) },
      u_colorMid: { value: hexToRgbVec3(colorMid) },
      u_colorLight: { value: hexToRgbVec3(colorLight) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // The magic happens here: We simulate a 3D surface (Normal Mapping) 
    // to calculate real diffuse and specular lighting against the folds.
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      
      uniform vec3 u_colorDark;
      uniform vec3 u_colorMid;
      uniform vec3 u_colorLight;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        
        // Correct aspect ratio to prevent stretching on widescreen monitors
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * u_speed;

        // 1. Angle the coordinate space diagonally to match the reference video
        p *= rot(-0.55); 
        
        // 2. Organic Domain Warping (The Drape)
        // Warp the X coordinate using Y to create the sweeping drape effect
        float drape = sin(p.y * 1.5 + t * 0.8) * 0.3 
                    + cos(p.y * 0.8 - t * 0.5) * 0.2;
                    
        // Warp X based on X to create naturally varying fold widths
        float pinch = sin(p.x * 2.0 - t * 0.3) * 0.1;
        
        // Final domain X for the wave function (6.5 creates ~4-5 folds on screen)
        float x = (p.x + drape + pinch) * 6.5; 
        
        // 3. Physical Height and 3D Normals
        float height = sin(x) * 0.5 + 0.5; // Maps height to 0.0 -> 1.0
        
        // Calculate the 3D normal vector of the wave surface
        // The mathematical derivative (slope) of sin(x) is cos(x). 
        // We multiply by 1.8 to artificially steepen the slopes for deeper shadows.
        vec3 normal = normalize(vec3(-cos(x) * 1.8, 0.1, 1.0));
        
        // 4. Directional Lighting Setup
        // Simulate a virtual light source coming from the top-left-front
        vec3 lightDir = normalize(vec3(-0.8, 0.5, 0.8)); 
        vec3 viewDir = vec3(0.0, 0.0, 1.0); // Viewer looking straight at the screen
        vec3 halfVector = normalize(lightDir + viewDir);
        
        // 5. Calculate Lighting Components
        // Diffuse (Lambertian) - Illuminates the slopes facing the light
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        // Specular (Blinn-Phong) - Creates the smooth, wide satin sheen
        float specular = pow(max(dot(normal, halfVector), 0.0), 12.0);
        
        // Micro-peak - Creates the ultra-sharp white/cyan ridges at the very crest
        float peak = pow(max(dot(normal, halfVector), 0.0), 64.0);
        
        // Ambient Occlusion - Darkens the deep valleys artificially
        float ao = mix(0.15, 1.0, height);
        
        // 6. Color Blending & Material Construction
        vec3 color = u_colorDark;                           // Start with deep shadow
        color = mix(color, u_colorMid, diffuse);            // Blend in mid-tone based on light
        color += u_colorLight * specular * 0.8;             // Add wide cyan satin sheen
        color += vec3(0.85, 0.95, 1.0) * peak * 0.6;        // Add sharp bright crests
        
        // Apply ambient occlusion to force deep valleys into darkness
        color *= ao;
        
        // 7. Post-Processing (Vignette & Contrast)
        float dist = length(uv - 0.5);
        color *= smoothstep(0.9, 0.2, dist * 0.8);
        
        // Contrast boost for richer appearance
        color = pow(color, vec3(1.15));

        gl_FragColor = vec4(color, 1.0);
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

    // 3. Animation Loop
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    // 4. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 5. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, colorDark, colorMid, colorLight]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000411] font-sans text-white ${className}`}>
      {/* Three.js Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      
      {/* Content Overlay */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}