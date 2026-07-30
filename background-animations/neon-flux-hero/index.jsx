import React from 'react';

// Helper to compile a WebGL shader
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

// Helper to convert hex colors to rgb for WebGL uniforms
function hexToRgb(hex) {
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
}) {
  const canvasRef = React.useRef(null);
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

    // Full screen triangle strip
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

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let initialSet = false;
    let animationFrameId;
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

    const render = (time) => {
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
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;

    mat2 rot(float a) { 
        return mat2(cos(a), -sin(a), sin(a), cos(a)); 
    }

    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    float map(vec3 p) {
        float t = uTime * 0.8;
        float d = 100.0;
        p.x += 1.8;
        p.y += 2.0;
        for(int i = 0; i < 4; i++) {
            vec3 q = p;
            float fi = float(i);
            q.x += sin(q.y * 0.5 + t * 1.2 + fi * 2.1) * 1.5;
            q.z += cos(q.y * 0.4 - t * 1.1 + fi * 1.8) * 1.5;
            q.x += sin(q.y * 2.5 - t * 2.5 + fi) * 0.2;
            float thickness = 1.2 - (q.y * 0.20);
            thickness = max(thickness, 0.02);
            float flameTongue = length(q.xz) - thickness;
            d = smin(d, flameTongue, 0.8);
        }
        return d * 0.5;
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p+e.xyy) - map(p-e.xyy),
            map(p+e.yxy) - map(p-e.yxy),
            map(p+e.yyx) - map(p-e.yyx)
        ));
    }

    float hash(vec2 p) {
        vec3 p3  = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        vec3 ro = vec3(0.0, 0.0, -8.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) {
            ro.yz *= rot((m.y - 0.5)*1.5);
            ro.xz *= rot((m.x - 0.5)*1.5);
        }
        rd.xy *= rot(-0.6);
        float dTotal = 0.0;
        vec3 p;
        float glow = 0.0;
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            glow += 0.015 / (0.01 + abs(d)) * exp(-dTotal * 0.05);
            if(d < 0.005 || dTotal > 30.0) break;
            dTotal += d * 0.9;
        }
        vec3 col = vec3(0.02, 0.00, 0.06);
        float starVal = hash(floor(rd.xy * 250.0 + rd.z * 100.0));
        if (starVal > 0.995) {
            float brightness = sin(uTime * 4.0 + starVal * 200.0) * 0.5 + 0.5;
            col += vec3(1.0, 0.7, 0.9) * brightness * 1.5;
        }
        float dust = sin(rd.x * 20.0 + uTime) * sin(rd.y * 20.0 - uTime);
        col += vec3(0.8, 0.3, 0.9) * smoothstep(0.8, 1.0, dust) * 0.1;
        if (dTotal < 30.0) {
            vec3 n = getNormal(p);
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
            float h = p.y + 2.0;
            vec3 c_white  = vec3(1.0, 1.0, 1.0);
            vec3 c_yellow = vec3(1.0, 0.9, 0.4);
            vec3 c_pink   = vec3(1.0, 0.15, 0.5);
            vec3 c_purple = vec3(0.4, 0.0, 0.8);
            vec3 c_dark   = vec3(0.04, 0.0, 0.1);
            vec3 objCol = mix(c_white, c_yellow, smoothstep(-3.5, -1.5, h));
            objCol = mix(objCol, c_pink, smoothstep(-1.5, 1.5, h));
            objCol = mix(objCol, c_purple, smoothstep(1.5, 5.0, h));
            objCol = mix(objCol, c_dark, smoothstep(5.0, 8.0, h));
            col = mix(col, objCol * (0.3 + fresnel * 2.5), 1.0);
            float pulse = sin(h * 3.0 - uTime * 4.0) * 0.5 + 0.5;
            col += objCol * pulse * 0.4 * fresnel;
        }
        vec3 glowCol = mix(vec3(1.0, 0.2, 0.5), vec3(0.4, 0.0, 0.8), smoothstep(-0.5, 0.5, uv.y));
        col += glowCol * glow * 0.18;
        col = mix(col, vec3(0.02, 0.0, 0.06), smoothstep(20.0, 30.0, dTotal));
        col = pow(col, vec3(0.85));
        col *= 1.0 - dot(uv, uv) * 0.3;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const NeonFluxHero = ({ className = '', children, ...props }) => (
  <div className={`relative w-full h-full bg-[#010003] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        {...props} 
      />
    </div>
    <div 
      className="absolute inset-0 z-[2] pointer-events-none" 
      style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(2, 0, 6, 0.85) 100%)' }} 
    />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="w-full h-screen">
      <NeonFluxHero>
      </NeonFluxHero>
    </div>
  );
}