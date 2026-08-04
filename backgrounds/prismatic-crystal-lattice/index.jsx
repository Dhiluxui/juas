import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface PrismaticCrystalLatticeProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Lattice Density */
  latticeDensity?: number;
  /** @title Prismatic Dispersion Intensity */
  dispersionIntensity?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const PrismaticCrystalLattice: React.FC<PrismaticCrystalLatticeProps> = ({
  speed = 0.8,
  latticeDensity = 1.0,
  dispersionIntensity = 1.2,
  children,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 3. Shader Uniforms & Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_latticeDensity: { value: latticeDensity },
      u_dispersion: { value: dispersionIntensity },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_latticeDensity;
      uniform float u_dispersion;

      varying vec2 vUv;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.xx + p3.yz) * p3.zy);
      }

      // Voronoi Crystal Cell Lattice
      vec3 voronoiCrystal(vec2 x, float t) {
        vec2 n = floor(x);
        vec2 f = fract(x);

        vec2 mg, mr;
        float md = 8.0;

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);

            if (d < md) {
              md = d;
              mr = r;
              mg = g;
            }
          }
        }

        md = 8.0;
        for (int j = -2; j <= 2; j++) {
          for (int i = -2; i <= 2; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
            vec2 r = g + o - f;

            if (dot(mr - r, mr - r) > 0.00001) {
              md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
            }
          }
        }

        return vec3(md, mr);
      }

      // Cosine Palette for Rainbow Prismatic Spectrum
      vec3 prismaticPalette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.3 * u_speed;

        // Mouse Crystal Refraction Shift
        float mouseDist = length(uv - mouse);
        float crystalRefract = exp(-mouseDist * 3.5);
        vec2 warpedUv = uv + (uv - mouse) * crystalRefract * 0.2;

        vec2 p = warpedUv * rot(0.2) * (u_latticeDensity * 3.5);

        // Calculate Voronoi crystal cell distances & normals
        vec3 crystal = voronoiCrystal(p, t);
        float edgeDist = crystal.x;
        vec2 cellCenter = crystal.yz;

        // Specular reflections on crystal facet ridges
        float facetRidge = pow(1.0 - smoothstep(0.0, 0.15, edgeDist), 4.0);
        float diamondHighlight = pow(smoothstep(0.1, 0.0, abs(edgeDist - 0.08)), 8.0);

        // Prismatic dispersion colors
        float colorPhase = cellCenter.x * 0.5 + cellCenter.y * 0.5 + t * 0.5;
        vec3 rainbowCol = prismaticPalette(colorPhase);

        // Color composition: Deep Crystal Blue -> Rainbow Facets -> Diamond Highlights
        vec3 bgDeep = vec3(0.01, 0.03, 0.08);
        vec3 crystalBlue = vec3(0.0, 0.6, 1.0);

        vec3 col = bgDeep;
        col = mix(col, crystalBlue * 0.5, smoothstep(0.0, 0.5, edgeDist));
        col += rainbowCol * facetRidge * 1.5 * u_dispersion;
        col += vec3(1.0, 0.95, 1.0) * diamondHighlight * 2.0;

        // Cursor refraction spotlight
        col += crystalBlue * crystalRefract * 1.2;

        // Vignette
        float vignette = smoothstep(1.6, 0.3, length(uv));
        col *= vignette;

        // Contrast adjustment
        col = pow(clamp(col, 0.0, 1.0), vec3(1.05));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse Listener
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);

      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animId);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, latticeDensity, dispersionIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#01040f] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default PrismaticCrystalLattice;
