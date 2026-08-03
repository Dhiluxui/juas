import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface NeonFireShaderBackgroundProps {
  /** @title Content Overlay */
  children?: React.ReactNode;
  /** @title Additional CSS Classes */
  className?: string;
  /** @title Animation Speed Multiplier */
  speed?: number;
}

export default function NeonFireShaderBackground({
  children,
  className = '',
  speed = 0.7,
}: NeonFireShaderBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    const domElement = renderer.domElement;
    mountRef.current.appendChild(domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      // 2D Random
      float random (in vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      // 2D Simplex Noise for organic smoke/fire textures
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time;

        // --- THE NEON BORDER MASK ---
        float edgeDistX = min(uv.x, 1.0 - uv.x);
        float borderMask = exp(-edgeDistX * 6.0) + exp(-uv.y * 6.0) * 1.5 + exp(-(1.0 - uv.y) * 8.0);
        borderMask = clamp(borderMask, 0.0, 1.0);

        // --- FLUID FIRE WARPING ---
        vec2 q = p;
        q.y -= t * 0.5;
        
        for(float i = 1.0; i <= 3.0; i++) {
            q.x += 0.25 / i * sin(i * q.y * 3.0 + t);
            q.y += 0.25 / i * cos(i * q.x * 2.5 - t * 0.8);
        }

        float noiseVal = snoise(q * 2.0 - vec2(0.0, t * 0.5)) * 0.5 + 0.5;
        float fireCore = smoothstep(0.1, 0.9, noiseVal * borderMask);

        // --- PRISMATIC GLASS FOLDS ---
        float fold = sin(q.x * 5.0 + q.y * 3.0);
        float rRidge = pow(1.0 - abs(sin(q.x * 5.0 + q.y * 3.0 + 0.1)), 6.0);
        float bRidge = pow(1.0 - abs(sin(q.x * 5.0 + q.y * 3.0 - 0.1)), 6.0);
        float gRidge = pow(1.0 - abs(fold), 6.0);
        
        vec3 glass = vec3(rRidge * 0.2, gRidge * 0.6, bRidge * 1.5) * borderMask;

        // --- COLOR MAPPING ---
        vec3 bg = vec3(0.00, 0.01, 0.03);
        vec3 col = bg;
        
        col = mix(col, vec3(0.0, 0.1, 0.8), smoothstep(0.0, 0.3, fireCore));
        col = mix(col, vec3(0.0, 0.5, 1.0), smoothstep(0.3, 0.6, fireCore));
        col = mix(col, vec3(0.0, 0.9, 1.0), smoothstep(0.6, 0.9, fireCore));
        col += vec3(0.8, 0.95, 1.0) * pow(fireCore, 3.0);

        col += glass * 0.8;

        // --- SPARK PARTICLE SYSTEM ---
        float sparks = 0.0;
        for(float i = 0.0; i < 3.0; i++) {
            vec2 suv = uv * (12.0 + i * 8.0);
            suv.y -= t * (1.2 + i * 0.6);
            suv.x += sin(t * 1.5 + suv.y * 0.5) * 1.2;
            
            vec2 sId = floor(suv);
            vec2 sF = fract(suv) - 0.5;
            
            float sRand = random(sId + i);
            if (sRand > 0.97) { 
                float dist = length(sF);
                sparks += (0.006 / (dist + 0.0001)) * (sRand - 0.97) * 30.0;
            }
        }
        
        sparks *= smoothstep(0.0, 0.6, borderMask);
        col += vec3(0.4, 0.8, 1.0) * sparks;

        // --- THE CENTER VOID ---
        float voidDist = length(p * vec2(0.85, 1.2));
        col *= smoothstep(1.6, 0.4, voidDist); 

        col = pow(col, vec3(1.1));

        gl_FragColor = vec4(col, 1.0);
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
      uniforms.u_time.value = clock.getElapsedTime() * speed;
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
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && domElement && domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000104] font-sans ${className}`}>
      {/* WebGL Canvas Background */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full z-0"
      />
      
      {/* Pure Children Overlay Slot */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}
