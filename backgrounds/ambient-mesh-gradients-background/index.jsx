import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface AmbientMeshGradientsBackgroundProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Grain Intensity */
  grainIntensity?: number;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function AmbientMeshGradientsBackground({
  speed = 0.15,
  grainIntensity = 0.04,
  children,
  className = '',
}: AmbientMeshGradientsBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_speed: { value: speed },
      u_grain: { value: grainIntensity },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      uniform float u_grain;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                           -0.577350269189626,
                            0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
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
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time * u_speed;

        vec3 bg = vec3(0.03, 0.03, 0.05);
        vec3 color1 = vec3(0.4, 0.1, 0.8);
        vec3 color2 = vec3(0.0, 0.6, 0.8);
        vec3 color3 = vec3(0.8, 0.1, 0.4);

        vec2 pos1 = vec2(uv.x + sin(t * 0.8) * 0.4, uv.y + cos(t * 0.5) * 0.4);
        vec2 pos2 = vec2(uv.x - cos(t * 0.6) * 0.5, uv.y - sin(t * 0.7) * 0.5);
        vec2 pos3 = vec2(uv.x + sin(t * 0.4) * 0.3, uv.y - cos(t * 0.9) * 0.6);

        float n = snoise(uv * 1.5 + t * 0.2) * 0.3;
        
        float d1 = smoothstep(1.5, 0.0, length(pos1) + n);
        float d2 = smoothstep(1.2, 0.0, length(pos2) + n);
        float d3 = smoothstep(1.0, 0.0, length(pos3) - n);

        vec3 finalColor = bg;
        finalColor = mix(finalColor, color1, d1 * 0.7);
        finalColor = mix(finalColor, color2, d2 * 0.6);
        finalColor = mix(finalColor, color3, d3 * 0.5);

        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
        finalColor += (grain - 0.5) * u_grain;

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

    window.addEventListener('resize', handleResize);

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
  }, [speed, grainIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#0a0a0c] font-sans selection:bg-cyan-500/30 ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 opacity-90" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default AmbientMeshGradientsBackground;
