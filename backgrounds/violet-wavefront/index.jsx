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

// Concentric rings expanding from an off-screen focal point, with their
// radius perturbed by low-frequency noise so the bands wobble like slow
// glowing smoke arcs instead of perfect circles.
const fragment = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform vec3 uColorGlow;
uniform vec3 uColorHighlight;
uniform vec3 uColorBg;
uniform float uSpeed;
uniform float uFreq;
uniform float uSharpness;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    total += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return total;
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  // Focal point sits above and to the right, echoing the off-frame source in the reference
  vec2 focal = vec2(0.9, 1.1) + (uMouse - 0.5) * 0.5;
  vec2 p = uv - focal;

  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Low-frequency angular noise bends the rings into irregular, organic arcs
  float wobble = fbm(vec2(angle * 1.5, uTime * 0.03 * uSpeed)) * 0.35;
  float r = radius + wobble;

  float t = uTime * 0.06 * uSpeed;
  float band = fract(r * uFreq - t);
  float wave = abs(band - 0.5) * 2.0;
  float glow = pow(1.0 - wave, uSharpness);

  vec3 col = mix(uColorBg, uColorGlow, glow);
  col = mix(col, uColorHighlight, pow(glow, 4.0));

  // Soft radial falloff so the far corners fade to background
  float falloff = smoothstep(2.6, 0.3, radius);
  col *= falloff;

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface VioletWavefrontProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Ring Frequency */
  frequency?: number;
  /** @title Band Sharpness */
  sharpness?: number;
  /** @title Glow Color */
  colorGlow?: string;
  /** @title Highlight Color */
  colorHighlight?: string;
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

export const VioletWavefront = ({
  speed = 1.0,
  frequency = 2.2,
  sharpness = 3.0,
  colorGlow = '#B026FF',
  colorHighlight = '#F0C6FF',
  colorBg = '#050008',
  mouseReact = true,
  children,
  className = '',
}: VioletWavefrontProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const targetMouse = useRef({ x: 0.5, y: 0.5 });

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
        uColorGlow: { value: new Color(...hexToRgb(colorGlow)) },
        uColorHighlight: { value: new Color(...hexToRgb(colorHighlight)) },
        uColorBg: { value: new Color(...hexToRgb(colorBg)) },
        uSpeed: { value: speed },
        uFreq: { value: frequency },
        uSharpness: { value: sharpness },
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
      targetMouse.current.x = (e.clientX - rect.left) / rect.width;
      targetMouse.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
    }
    if (mouseReact) window.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    function update(time: number) {
      animId = requestAnimationFrame(update);
      mousePos.current.x += (targetMouse.current.x - mousePos.current.x) * 0.05;
      mousePos.current.y += (targetMouse.current.y - mousePos.current.y) * 0.05;
      program.uniforms.uTime.value = time * 0.001;
      (program.uniforms.uMouse.value as Float32Array)[0] = mousePos.current.x;
      (program.uniforms.uMouse.value as Float32Array)[1] = mousePos.current.y;
      renderer.render({ scene: mesh });
    }
    animId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (mouseReact) window.removeEventListener('mousemove', handleMouseMove);
      ctn!.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [speed, frequency, sharpness, colorGlow, colorHighlight, colorBg, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default VioletWavefront;
