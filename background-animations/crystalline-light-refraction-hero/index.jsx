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

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // Elegant Octahedron / Diamond SDF
      float sdOctahedron( vec3 p, float s) {
          p = abs(p);
          return (p.x+p.y+p.z-s)*0.57735027;
      }
      
      float sdBox( vec3 p, vec3 b ) {
          vec3 q = abs(p) - b;
          return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
      }

      // Premium Crystal shape
      float map(vec3 p) {
          p.xy *= rot(uTime * 0.15);
          p.yz *= rot(uTime * 0.1);
          
          float d = sdOctahedron(p, 1.8);
          // Facet cuts by intersecting with a rotated box
          vec3 p2 = p;
          p2.xy *= rot(3.14159 / 4.0);
          p2.yz *= rot(3.14159 / 4.0);
          float cut = sdBox(p2, vec3(1.2));
          d = max(d, cut);
          
          // Outer shell shards
          for(int i = 0; i < 3; i++) {
              p.xy *= rot(1.23);
              p.xz *= rot(2.34);
              float shard = sdOctahedron(p - vec3(0.0, 0.8, 0.0), 0.8);
              d = min(d, max(shard, sdBox(p, vec3(1.5))));
          }
          
          return d;
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.001, 0.0);
          return normalize(vec3(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
          ));
      }
      
      // Beautiful simulated environment map
      vec3 envMap(vec3 dir) {
          // A premium studio lighting setup
          float light1 = smoothstep(0.8, 1.0, dot(dir, normalize(vec3(1.0, 1.0, 1.0))));
          float light2 = smoothstep(0.9, 1.0, dot(dir, normalize(vec3(-1.0, -0.5, 0.5))));
          
          vec3 color = vec3(0.02, 0.03, 0.05); // dark base
          color += vec3(1.0, 0.9, 0.8) * light1 * 2.0; // warm light
          color += vec3(0.4, 0.6, 1.0) * light2 * 1.5; // cool rim light
          
          // Subtle cosmic gradient
          color += vec3(0.1, 0.15, 0.25) * (dir.y * 0.5 + 0.5);
          
          return color;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);
          m = (m - 0.5) * 2.0;

          vec3 ro = vec3(0.0, 0.0, -4.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot(m.x * 0.5);
          rd.yz *= rot(m.y * 0.5);
          
          float t = 0.0;
          vec3 col = envMap(rd) * 0.1; // bg color
          
          for(int i = 0; i < 100; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.001) {
                  vec3 n = calcNormal(p);
                  
                  // Fresnel
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
                  
                  // Chromatic Dispersion Refraction
                  float iorR = 1.15;
                  float iorG = 1.18;
                  float iorB = 1.22;
                  
                  vec3 refR = refract(rd, n, 1.0/iorR);
                  vec3 refG = refract(rd, n, 1.0/iorG);
                  vec3 refB = refract(rd, n, 1.0/iorB);
                  
                  // Internal reflections if total internal reflection occurs
                  if(length(refR)==0.0) refR = reflect(rd, n);
                  if(length(refG)==0.0) refG = reflect(rd, n);
                  if(length(refB)==0.0) refB = reflect(rd, n);
                  
                  // Sample env map through crystal
                  vec3 refrColor = vec3(
                      envMap(refR).r,
                      envMap(refG).g,
                      envMap(refB).b
                  );
                  
                  // Reflection
                  vec3 reflColor = envMap(reflect(rd, n));
                  
                  // Glass material blending
                  col = mix(refrColor, reflColor, fre);
                  
                  // Inner glow
                  col += vec3(0.2, 0.5, 0.8) * 0.15; 
                  
                  break;
              }
              
              t += d;
              if(t > 15.0) break;
          }
          
          // Post processing (ACES)
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          // Vignette
          col *= 1.0 - 0.3 * length(uv);
          
          gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
      }
  `
};

export const CrystallineLightRefractionHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#010204] overflow-hidden font-sans ${className}`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 2, 4, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
