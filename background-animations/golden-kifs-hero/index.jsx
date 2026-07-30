import React, { useEffect, useRef } from 'react';

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [1, 1, 1];
}

function ShaderBackground({ 
  vertexShaderSource, 
  fragmentShaderSource, 
  className = '',
  speed = 1.0,
  color1 = '#ff0000',
  color2 = '#0000ff',
  ...props
}: any) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouseRef = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    const finalPosLoc = positionLocation >= 0 ? positionLocation : aPositionLocation;
    if (finalPosLoc >= 0) {
      gl.enableVertexAttribArray(finalPosLoc);
      gl.vertexAttribPointer(finalPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    
    const uvLocation = gl.getAttribLocation(program, 'uv');
    if (uvLocation >= 0) {
      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const timeLocation = gl.getUniformLocation(program, 'iTime');
    const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const mouseLocation = gl.getUniformLocation(program, 'iMouse');
    
    const uTimeLocation = gl.getUniformLocation(program, 'u_time');
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const uResLocation = gl.getUniformLocation(program, 'u_res');

    const uTimeCamel = gl.getUniformLocation(program, 'uTime');
    const uResolutionCamel = gl.getUniformLocation(program, 'uResolution');
    const uMouseCamel = gl.getUniformLocation(program, 'uMouse');
    
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let initialSet = false;
    let animationFrameId: number;
    let startTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (time: number) => {
      resize();

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (timeLocation !== null) gl.uniform1f(timeLocation, t);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      if (uTimeLocation !== null) gl.uniform1f(uTimeLocation, t);
      if (uResolutionLocation !== null) gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      if (uMouseLocation !== null) gl.uniform2f(uMouseLocation, mouseRef.current.x, mouseRef.current.y);
      if (uResLocation !== null) gl.uniform2f(uResLocation, canvas.width, canvas.height);

      if (uTimeCamel !== null) gl.uniform1f(uTimeCamel, t);
      if (uResolutionCamel !== null) gl.uniform2f(uResolutionCamel, canvas.width, canvas.height);
      if (uMouseCamel !== null) gl.uniform2f(uMouseCamel, mouseRef.current.x, mouseRef.current.y);
      
      if (uSpeedLoc !== null) gl.uniform1f(uSpeedLoc, speed);
      if (uColor1Loc !== null) {
        const c1 = hexToRgb(color1);
        gl.uniform3f(uColor1Loc, c1[0], c1[1], c1[2]);
      }
      if (uColor2Loc !== null) {
        const c2 = hexToRgb(color2);
        gl.uniform3f(uColor2Loc, c2[0], c2[1], c2[2]);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
    };
  }, [vertexShaderSource, fragmentShaderSource, speed, color1, color2]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-auto ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

const shaderData = {
  vertex: `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `,
  fragment: `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;

      #define MAX_STEPS 100
      #define MAX_DIST 10.0
      #define SURF_DIST 0.001

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
      }

      vec2 fold(vec2 p, float ang) {
          vec2 n = vec2(cos(-ang), sin(-ang));
          p -= 2.0 * min(0.0, dot(p, n)) * n;
          return p;
      }

      float map(vec3 p) {
          vec3 bp = p;
          
          // Smooth, organic motion
          float t = uTime * 0.15;
          
          // Gentle twisting and rotating
          p.xz *= rot(t * 0.5);
          p.yz *= rot(sin(t * 0.3) * 0.5);
          
          float scale = 1.0;
          
          // Elegant KIFS loop
          for(int i = 0; i < 5; i++) {
              p.xy = fold(p.xy, 3.14159 / 3.0);
              p.yz = fold(p.yz, 3.14159 / 4.0);
              p.xy *= rot(0.2 + t * 0.1);
              
              p = p * 2.0 - vec3(0.6, 0.4, 0.6);
              scale *= 2.0;
          }
          
          float d1 = (length(p) - 0.5) / scale;
          
          // Combine with a smooth sphere to add an organic core
          float core = length(bp) - 0.8;
          
          return smin(d1, core, 0.4);
      }

      vec3 getNormal(vec3 p) {
          float d = map(p);
          vec2 e = vec2(0.001, 0);
          vec3 n = d - vec3(
              map(p - e.xyy),
              map(p - e.yxy),
              map(p - e.yyx)
          );
          return normalize(n);
      }
      
      // Calculate soft shadow
      float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
          float res = 1.0;
          float t = mint;
          for(int i = 0; i < 24; i++) {
              if (t > maxt) break;
              float h = map(ro + rd * t);
              if (h < 0.001) return 0.0;
              res = min(res, k * h / t);
              t += h;
          }
          return res;
      }
      
      // Ambient Occlusion
      float calcAO(vec3 pos, vec3 nor) {
          float occ = 0.0;
          float sca = 1.0;
          for(int i = 0; i < 5; i++) {
              float h = 0.01 + 0.12 * float(i) / 4.0;
              float d = map(pos + h * nor);
              occ += (h - d) * sca;
              sca *= 0.95;
              if (occ > 0.35) break;
          }
          return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          
          // Smooth mouse interaction
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);
          m = (m - 0.5) * 2.0; // -1 to 1

          // Camera setup
          vec3 ro = vec3(0.0, 0.0, -2.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          // Subtle camera movement
          ro.x += sin(uTime * 0.1) * 0.1;
          ro.y += cos(uTime * 0.15) * 0.1;
          
          rd.xy *= rot(m.x * 0.15);
          rd.yz *= rot(m.y * 0.15);

          float d = 0.0;
          float t = 0.0;
          vec3 p;
          
          for(int i = 0; i < MAX_STEPS; i++) {
              p = ro + rd * t;
              d = map(p);
              if(d < SURF_DIST || t > MAX_DIST) break;
              t += d * 0.7; // Raymarch slower for softer shapes
          }

          vec3 col = vec3(0.01); // Dark premium background

          if(t < MAX_DIST) {
              vec3 n = getNormal(p);
              vec3 v = -rd;
              
              // Materials
              vec3 albedo = vec3(1.0, 0.75, 0.3); // Premium Gold
              
              // Lighting
              vec3 lig = normalize(vec3(0.8, 1.0, -0.5));
              vec3 hal = normalize(lig + v);
              
              float dif = clamp(dot(n, lig), 0.0, 1.0);
              float sha = softShadow(p, lig, 0.02, 2.5, 12.0);
              float ao = calcAO(p, n);
              float fre = clamp(1.0 + dot(n, rd), 0.0, 1.0);
              float spe = pow(clamp(dot(n, hal), 0.0, 1.0), 48.0);
              
              // Base lighting
              vec3 lin = vec3(0.0);
              lin += 2.5 * dif * sha * vec3(1.0, 0.9, 0.8);
              lin += 0.5 * ao * vec3(0.1, 0.15, 0.2); // Subtle ambient cool
              lin += 1.5 * fre * ao * vec3(1.0, 0.7, 0.4); // Golden rim light
              
              col = albedo * lin;
              col += spe * sha * vec3(1.0, 0.95, 0.8) * 1.5; // Hot specular
              
              // Inner glowing depths based on ambient occlusion
              col += mix(vec3(0.8, 0.2, 0.0), vec3(0.0), ao) * 0.4;
          } else {
              // Background gradient
              col = mix(vec3(0.0, 0.0, 0.0), vec3(0.05, 0.03, 0.0), length(uv));
          }

          // Depth of field / atmospheric fog
          col = mix(col, vec3(0.01, 0.01, 0.01), 1.0 - exp(-0.15 * t * t));

          // ACES Tonemapping
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
          
          // Subtle vignette
          col *= 1.0 - 0.4 * dot(uv, uv);

          gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
      }
  `
};

export const GoldenKifsHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
