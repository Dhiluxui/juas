import React from 'react';

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
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;

    mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

    // Smooth min to fuse the petals organically at their base
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    float sdSphere(vec3 p, float s) { return length(p) - s; }

    // Map the Abyssal Bioluminescent Bloom
    float map(vec3 p) {
        float t = uTime * 0.6;
        
        // Slowly rotate the entire flower
        p.xy *= rot(t * 0.2);
        p.xz *= rot(t * 0.3);
        
        float d = 100.0;
        
        // Generate 8 massive petals
        for(int i = 0; i < 8; i++) {
            vec3 q = p;
            
            // Angle per petal (45 degrees)
            float fi = float(i) * 3.14159 / 4.0; 
            
            // Arrange spherically
            q.xy *= rot(fi); 
            
            // The petals physically bend outward and fold inward based on time
            float fold = sin(t) * 0.3 + 0.6; // The bloom opens and closes
            q.xz *= rot(fold);
            
            // Sculpt the petal shape by stretching a sphere mathematically
            q.y -= 1.2; // Move it outward from the center
            q.x *= 2.5; // Flatten the width
            q.z *= 5.0; // Flatten the depth (makes it thin like a leaf)
            
            // Calculate distance, scaling it back down to world space
            float petal = sdSphere(q, 1.2) / 5.0; 
            
            // Organically fuse the petals where they touch at the base
            d = smin(d, petal, 0.4);
        }
        
        // Central bioluminescent stamen / pearl
        float core = sdSphere(p, 0.4 + sin(t * 3.0) * 0.05);
        d = min(d, core);
        
        return d;
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
            map(p+e.xyy) - map(p-e.xyy), 
            map(p+e.yxy) - map(p-e.yxy), 
            map(p+e.yyx) - map(p-e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Floating underwater camera
        vec3 ro = vec3(0.0, 0.0, -4.5);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) { 
            ro.yz *= rot((m.y - 0.5)*2.0); ro.xz *= rot((m.x - 0.5)*2.0); 
            rd.yz *= rot((m.y - 0.5)*2.0); rd.xz *= rot((m.x - 0.5)*2.0); 
        }
        
        float dTotal = 0.0;
        vec3 p;
        float glow = 0.0;
        
        // Raymarch the flower
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Volumetrically accumulate light scattering from the central pearl
            float core = length(p) - 0.4;
            glow += 0.005 / (0.01 + abs(core));
            
            if(d < 0.001 || dTotal > 10.0) break;
            
            // Scale down step size drastically because smin and scaling operations warp distance fields
            dTotal += d * 0.7; 
        }
        
        vec3 col = vec3(0.01, 0.02, 0.03); // Deep ocean abyss
        
        if (dTotal < 10.0) {
            vec3 n = getNormal(p);
            vec3 l = normalize(vec3(0.0, 2.0, -2.0)); // Soft top-down light
            float diff = max(dot(n, l), 0.0);
            
            // Fleshy, dark aquatic petal material
            col = vec3(0.0, 0.1, 0.15) * diff;
            
            // Slick, wet specular reflection
            vec3 ref = reflect(rd, n);
            float spec = pow(max(dot(ref, l), 0.0), 32.0);
            col += vec3(0.0, 0.8, 1.0) * spec * 0.6; 
            
            // Intense Bioluminescent edge rim lighting (Fresnel)
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            
            // Colors shift between deep blue and bright cyan
            vec3 bioColor = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.8), sin(uTime) * 0.5 + 0.5);
            col += bioColor * fresnel * 1.5;
        }
        
        // Add the blinding volumetric bio-glow from the core
        col += vec3(0.0, 1.0, 0.8) * glow * 0.8;
        col += vec3(1.0, 1.0, 1.0) * pow(glow * 0.3, 2.0); // White-hot center
        
        col = pow(col, vec3(0.85)); // Gamma
        col *= 1.0 - dot(uv, uv) * 0.5; // Heavy vignette to simulate deep water
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const AbyssalBloomHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#010203] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 2, 3, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
