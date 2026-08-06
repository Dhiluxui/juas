import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface OrbitalGravitationalVortexProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Vortex Swirl Intensity */
  swirlIntensity?: number;
  /** @title Accretion Disk Brightness */
  brightness?: number;
  /** @title Children Overlay */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export const OrbitalGravitationalVortex: React.FC<OrbitalGravitationalVortexProps> = ({
  speed = 1.0,
  swirlIntensity = 1.2,
  brightness = 1.3,
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

    // 1. Scene & Orthographic Camera
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
      u_swirl: { value: swirlIntensity },
      u_brightness: { value: brightness },
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
      uniform float u_swirl;
      uniform float u_brightness;

      varying vec2 vUv;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          val += amp * noise(p);
          p *= rot(0.5);
          p *= 2.02;
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * 0.35 * u_speed;

        // Gravitational Lens distortion from mouse
        float mouseDist = length(uv - mouse);
        float mouseLens = exp(-mouseDist * 3.5) * 0.2;
        vec2 warpedUv = uv + normalize(uv - mouse + 0.0001) * mouseLens;

        // Polar coordinates
        float r = length(warpedUv);
        float a = atan(warpedUv.y, warpedUv.x);

        // Frame dragging swirl rotation
        float swirl = a + (u_swirl * 2.5) / (r + 0.1) + t * 0.8;
        vec2 swirlUv = vec2(r * cos(swirl), r * sin(swirl));

        // Accretion disk plasma FBM
        float plasma = fbm(swirlUv * 4.0 + vec2(t * 0.5, -t * 0.3));

        // Relativistic Doppler Beaming
        float doppler = smoothstep(-1.0, 1.0, sin(swirl));

        // Photon Ring and Accretion Disk profile
        float photonRing = exp(-abs(r - 0.22) * 20.0);
        float accretionDisk = exp(-abs(r - 0.45) * 4.0) * plasma;

        // Color Palettes: Black Hole Void -> Magenta Red -> Electric Cyan -> White Hot Ring
        vec3 colVoid = vec3(0.01, 0.005, 0.03);
        vec3 colRedDoppler = vec3(1.0, 0.05, 0.4);
        vec3 colCyanDoppler = vec3(0.0, 0.85, 1.0);
        vec3 colRingWhite = vec3(1.0, 0.98, 0.9);

        vec3 col = colVoid;
        col += mix(colRedDoppler, colCyanDoppler, doppler) * accretionDisk * u_brightness;
        col += colRingWhite * photonRing * 2.2;

        // Event Horizon Interior Void
        col *= smoothstep(0.18, 0.22, r);

        // Cursor Gravitational Glow
        col += colCyanDoppler * mouseLens * 1.5;

        // Vignette
        col *= smoothstep(1.5, 0.2, length(uv));

        // Tone Mapping
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
  }, [speed, swirlIntensity, brightness]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#020008] font-sans ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default OrbitalGravitationalVortex;
