import React, { useEffect, useRef } from 'react';

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function ShaderBackground({ vertexShaderSource, fragmentShaderSource, className = '' }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !frag) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const positions = new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(program, 'position');
    const apl = gl.getAttribLocation(program, 'a_position');
    const fpl = pl >= 0 ? pl : apl;
    if (fpl >= 0) { gl.enableVertexAttribArray(fpl); gl.vertexAttribPointer(fpl, 2, gl.FLOAT, false, 0, 0); }
    const u = (n) => gl.getUniformLocation(program, n);
    const locs = { iTime: u('iTime'), iRes: u('iResolution'), iMouse: u('iMouse'), uTime: u('u_time'), uRes: u('u_resolution'), uMouse: u('u_mouse'), uRes2: u('u_res'), uTimeCamel: u('uTime'), uResCamel: u('uResolution'), uMouseCamel: u('uMouse') };
    const onMouse = (e) => { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); mouseRef.current.x = (e.clientX - rect.left) * dpr; mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr; };
    window.addEventListener('mousemove', onMouse);
    let init = false, raf, start = performance.now();
    const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr; if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } };
    const render = (time) => {
      resize();
      if (!init && canvas.width > 0) { mouseRef.current.x = canvas.width / 2; mouseRef.current.y = canvas.height / 2; init = true; }
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const t = (time - start) * 0.001; const mx = mouseRef.current.x, my = mouseRef.current.y; const w = canvas.width, h = canvas.height;
      if (locs.iTime) gl.uniform1f(locs.iTime, t); if (locs.iRes) gl.uniform2f(locs.iRes, w, h); if (locs.iMouse) gl.uniform2f(locs.iMouse, mx, my);
      if (locs.uTime) gl.uniform1f(locs.uTime, t); if (locs.uRes) gl.uniform2f(locs.uRes, w, h); if (locs.uMouse) gl.uniform2f(locs.uMouse, mx, my);
      if (locs.uRes2) gl.uniform2f(locs.uRes2, w, h); if (locs.uTimeCamel) gl.uniform1f(locs.uTimeCamel, t); if (locs.uResCamel) gl.uniform2f(locs.uResCamel, w, h); if (locs.uMouseCamel) gl.uniform2f(locs.uMouseCamel, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 6); raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => { window.removeEventListener('mousemove', onMouse); cancelAnimationFrame(raf); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(frag); gl.deleteBuffer(pb); };
  }, [vertexShaderSource, fragmentShaderSource]);
  return <canvas ref={canvasRef} className={"w-full h-full block pointer-events-auto " + className} style={{ touchAction: 'none' }} />;
}

const shaderData = {
  vertex: `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`,
  fragment: `
    precision highp float;
    uniform vec2 uResolution; uniform float uTime; uniform vec2 uMouse;
    mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
    float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
    float sdSphere(vec3 p, float s) { return length(p) - s; }
    float map(vec3 p) {
      float t = uTime * 0.6;
      p.xy *= rot(t * 0.2); p.xz *= rot(t * 0.3);
      float d = 100.0;
      for(int i = 0; i < 8; i++) {
        vec3 q = p; float fi = float(i) * 3.14159 / 4.0;
        q.xy *= rot(fi); float fold = sin(t) * 0.3 + 0.6; q.xz *= rot(fold);
        q.y -= 1.2; q.x *= 2.5; q.z *= 5.0;
        float petal = sdSphere(q, 1.2) / 5.0;
        d = smin(d, petal, 0.4);
      }
      float core = sdSphere(p, 0.4 + sin(t * 3.0) * 0.05);
      d = min(d, core);
      return d;
    }
    vec3 getNormal(vec3 p) { vec2 e = vec2(0.002, 0.0); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
      vec3 ro = vec3(0.0, 0.0, -4.5); vec3 rd = normalize(vec3(uv, 1.0));
      vec2 m = uMouse / uResolution;
      if(length(uMouse) > 10.0) { ro.yz *= rot((m.y-0.5)*2.0); ro.xz *= rot((m.x-0.5)*2.0); rd.yz *= rot((m.y-0.5)*2.0); rd.xz *= rot((m.x-0.5)*2.0); }
      float dTotal = 0.0; vec3 p; float glow = 0.0;
      for(int i = 0; i < 90; i++) {
        p = ro + rd * dTotal; float d = map(p);
        float core = length(p) - 0.4; glow += 0.005 / (0.01 + abs(core));
        if(d < 0.001 || dTotal > 10.0) break;
        dTotal += d * 0.7;
      }
      vec3 col = vec3(0.01, 0.02, 0.03);
      if (dTotal < 10.0) {
        vec3 n = getNormal(p); vec3 l = normalize(vec3(0.0, 2.0, -2.0));
        float diff = max(dot(n, l), 0.0);
        col = vec3(0.0, 0.1, 0.15) * diff;
        vec3 ref = reflect(rd, n); float spec = pow(max(dot(ref, l), 0.0), 32.0);
        col += vec3(0.0, 0.8, 1.0) * spec * 0.6;
        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 bioColor = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.8), sin(uTime) * 0.5 + 0.5);
        col += bioColor * fresnel * 1.5;
      }
      col += vec3(0.0, 1.0, 0.8) * glow * 0.8;
      col += vec3(1.0) * pow(glow * 0.3, 2.0);
      col = pow(col, vec3(0.85));
      col *= 1.0 - dot(uv, uv) * 0.5;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const AbyssalBloomHero = ({ className = '', children, ...props }) => (
  <div className={`relative w-full h-full bg-[#010203] overflow-hidden font-sans ${className}`} {...props}>
    <div className="absolute inset-0 z-0"><ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} /></div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 2, 3, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none"><div className="pointer-events-auto">{children}</div></div>
  </div>
);