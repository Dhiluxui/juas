import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const vertex = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Mirrors the UV field across both axes, then measures distance to a pair
// of angled rays to build glowing beams that meet at sharp points - the
// symmetric "bowtie" kaleidoscope look of the reference clip.
const fragment = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform vec3 uColorCore;
uniform vec3 uColorGlow;
uniform vec3 uColorBg;
uniform float uSpeed;
uniform float uRayAngle;
uniform float uFlicker;

varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// Distance from a point to a V-shaped pair of rays opening upward with slope k
float rayDist(vec2 p, float k) {
  return abs(abs(p.x) - k * p.y);
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  // Mirror across both axes so the pattern folds into a symmetric bowtie
  vec2 p = abs(uv);

  float t = uTime * uSpeed;
  float mouseShift = (uMouse.x - 0.5) * 0.5;
  p.x += mouseShift * p.y * 0.3;

  // Gentle flicker on the ray angle gives the beams a living, flame-like wobble
  float wobble = sin(t * 0.6) * uFlicker;
  float k = uRayAngle + wobble;

  float d = rayDist(p, k);

  // Layer several glow widths for a soft-to-bright falloff, like the reference's halo
  float glowWide = smoothstep(0.9, 0.0, d);
  float glowMid = smoothstep(0.35, 0.0, d);
  float glowCore = smoothstep(0.06, 0.0, d);

  vec3 col = uColorBg;
  col += uColorGlow * glowWide * 0.55;
  col += uColorGlow * glowMid * 0.85;
  col += uColorCore * glowCore * 1.3;

  // Faint secondary rays offset in time, echoing the layered beams in the source clip
  float d2 = rayDist(p, k * 1.6 + 0.15);
  col += uColorGlow * smoothstep(0.5, 0.0, d2) * 0.2;

  // Sparse twinkle for texture within the beam
  float sparkle = step(0.995, hash(floor(uv.x * 300.0) + floor(uv.y * 300.0) * 300.0 + floor(t * 3.0)));
  col += vec3(sparkle) * glowMid * 0.4;

  float vig = smoothstep(1.8, 0.2, length(uv));
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface KaleidoBeamProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Ray Angle */
  rayAngle?: number;
  /** @title Flicker Amount */
  flicker?: number;
  /** @title Core Color */
  colorCore?: string;
  /** @title Glow Color */
  colorGlow?: string;
  /** @title Background Color */
  colorBg?: string;
  /** @title Mouse Reactivity */
  mouseReact?: boolean;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

export const KaleidoBeam = ({
  speed = 1.0,
  rayAngle = 0.55,
  flicker = 0.05,
  colorCore = '#EAF4FF',
  colorGlow = '#2C6BFF',
  colorBg = '#00010A',
  mouseReact = true,
  children,
  className = '',
}: KaleidoBeamProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    const renderer = new Renderer({ antialias: false, alpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    ctn.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uColorCore: { value: new Color(...hexToRgb(colorCore)) },
        uColorGlow: { value: new Color(...hexToRgb(colorGlow)) },
        uColorBg: { value: new Color(...hexToRgb(colorBg)) },
        uSpeed: { value: speed },
        uRayAngle: { value: rayAngle },
        uFlicker: { value: flicker },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(ctn!.clientWidth * dpr, ctn!.clientHeight * dpr);
      program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    function handleMouseMove(e: MouseEvent) {
      const rect = ctn!.getBoundingClientRect();
      mousePos.current.x = (e.clientX - rect.left) / rect.width;
      mousePos.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
      (program.uniforms.uMouse.value as Float32Array)[0] = mousePos.current.x;
      (program.uniforms.uMouse.value as Float32Array)[1] = mousePos.current.y;
    }
    if (mouseReact) ctn.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    function update(time: number) {
      animId = requestAnimationFrame(update);
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
    }
    animId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (mouseReact) ctn!.removeEventListener('mousemove', handleMouseMove);
      ctn!.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [speed, rayAngle, flicker, colorCore, colorGlow, colorBg, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default KaleidoBeam;
