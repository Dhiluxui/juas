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

// Several ring-emitting point sources stacked vertically. Their concentric
// waves overlap and interfere, producing the stacked vesica/lens shapes
// seen in the reference clip.
const fragment = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform vec3 uColorGlow;
uniform vec3 uColorCore;
uniform vec3 uColorBg;
uniform float uSpeed;
uniform float uFreq;
uniform float uSpacing;

varying vec2 vUv;

float ringWave(vec2 p, vec2 source, float freq, float t) {
  float d = length(p - source);
  float w = sin(d * freq - t) * 0.5 + 0.5;
  // Sharpen the wave into narrow bright bands rather than a smooth sinusoid
  return pow(w, 6.0);
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  vec2 p = uv;
  p.x += (uMouse.x - 0.5) * 0.3;

  float t = uTime * uSpeed;

  float total = 0.0;
  // Five stacked sources along the vertical axis; loop bound stays constant for shader compat
  for (int i = -2; i <= 2; i++) {
    float fi = float(i);
    vec2 source = vec2(0.0, fi * uSpacing);
    total += ringWave(p, source, uFreq, t) * (1.0 - abs(fi) * 0.12);
  }

  vec3 col = mix(uColorBg, uColorGlow, clamp(total, 0.0, 1.0));
  col = mix(col, uColorCore, pow(clamp(total, 0.0, 1.0), 5.0));

  // Perspective-style fade toward the bottom, echoing the reference's vanishing rings
  float bottomFade = smoothstep(-1.4, 0.4, p.y);
  col *= mix(0.15, 1.0, bottomFade);

  float vig = smoothstep(2.0, 0.3, length(uv));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface LensRippleProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Ripple Frequency */
  frequency?: number;
  /** @title Source Spacing */
  spacing?: number;
  /** @title Glow Color */
  colorGlow?: string;
  /** @title Core Color */
  colorCore?: string;
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

export const LensRipple = ({
  speed = 1.0,
  frequency = 18.0,
  spacing = 0.62,
  colorGlow = '#3355FF',
  colorCore = '#DCE8FF',
  colorBg = '#00010A',
  mouseReact = true,
  children,
  className = '',
}: LensRippleProps) => {
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
        uColorGlow: { value: new Color(...hexToRgb(colorGlow)) },
        uColorCore: { value: new Color(...hexToRgb(colorCore)) },
        uColorBg: { value: new Color(...hexToRgb(colorBg)) },
        uSpeed: { value: speed },
        uFreq: { value: frequency },
        uSpacing: { value: spacing },
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
  }, [speed, frequency, spacing, colorGlow, colorCore, colorBg, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default LensRipple;
