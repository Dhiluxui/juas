import React, { useRef, useEffect } from 'react';

export interface MoltenGlassRipplesProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Warm Color */
  colorA?: string;
  /** @title Cool Color */
  colorB?: string;
  /** @title Ripple Density */
  density?: number;
  /** @title React To Cursor */
  mouseReact?: boolean;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
}

const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// AFTER EFFECTS SIM: two domain-warped fbm layers act like a "Displace" + "Glass"
// pass, refracting a slow-drifting gradient the way light bends through molten glass.
const FRAGMENT = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSpeed;
uniform float uDensity;
uniform vec3 uColorA;
uniform vec3 uColorB;

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
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed * 0.15;

  vec2 pull = (uMouse - 0.5) * 0.6;
  uv += pull * smoothstep(1.2, 0.0, length(uv));

  vec2 warpA = vec2(fbm(uv * uDensity + t), fbm(uv * uDensity - t + 4.2));
  vec2 warpB = vec2(fbm((uv + warpA) * uDensity * 1.6 - t * 1.3),
                     fbm((uv - warpA) * uDensity * 1.6 + t * 1.1));
  float ripple = fbm(uv * uDensity * 2.0 + warpB * 1.5);

  float bands = sin((uv.x + uv.y) * 6.0 + ripple * 8.0 - t * 2.0) * 0.5 + 0.5;
  float glow = smoothstep(0.15, 0.85, ripple) * bands;

  vec3 col = mix(uColorB, uColorA, glow);
  col = mix(col, vec3(1.0), pow(max(warpB.x - warpB.y, 0.0), 3.0) * 0.6);

  float vig = smoothstep(1.15, 0.2, length(uv));
  col *= vig;

  fragColor = vec4(col, 1.0);
}
`;

export const MoltenGlassRipples = ({
  speed = 1.0,
  colorA = '#ff8a3d',
  colorB = '#1a2b6b',
  density = 2.4,
  mouseReact = true,
  children,
  className = '',
}: MoltenGlassRipplesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return;

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(s));
      }
      return s;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uDensity = gl.getUniformLocation(program, 'uDensity');
    const uColorA = gl.getUniformLocation(program, 'uColorA');
    const uColorB = gl.getUniformLocation(program, 'uColorB');

    const [ar, ag, ab] = hexToVec3(colorA);
    const [br, bg, bb] = hexToVec3(colorB);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas!.clientWidth * dpr);
      const h = Math.floor(canvas!.clientHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
    }
    if (mouseReact) window.addEventListener('mousemove', onMove);

    let raf = 0;
    const start = performance.now();
    function render(now: number) {
      resize();
      const t = (now - start) * 0.001;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, t);
      gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl!.uniform1f(uSpeed, speed);
      gl!.uniform1f(uDensity, density);
      gl!.uniform3f(uColorA, ar, ag, ab);
      gl!.uniform3f(uColorB, br, bg, bb);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (mouseReact) window.removeEventListener('mousemove', onMove);
      gl!.deleteProgram(program);
      gl!.deleteBuffer(posBuf);
    };
  }, [speed, colorA, colorB, density, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default MoltenGlassRipples;
