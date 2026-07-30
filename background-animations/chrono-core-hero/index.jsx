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
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;

    // 2D Rotation Matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // 3D KIFS (Kaleidoscopic Iterated Function System) Map
    float map(vec3 p) {
        float scale = 1.0;
        float t = uTime;
        
        // Ticking mechanism for clockwork movement
        // Snaps into place smoothly, imitating a massive mechanical clock
        float tick = floor(t * 3.0) + smoothstep(0.0, 0.2, fract(t * 3.0));
        
        // Global rotation of the core
        p.xz *= rot(t * 0.2);
        p.yz *= rot(t * 0.1);
        
        // Iterative Space Folding
        for(int i = 0; i < 7; i++) {
            // Octant mirroring
            p.xyz = abs(p.xyz);
            
            // Mechanical clockwork rotation folds
            p.xy *= rot(0.25 * 3.14159 + tick * 0.08 * float(i));
            p.xz *= rot(0.15 * 3.14159);
            
            // Translation and Scaling
            p = p * 1.8 - vec3(0.9, 1.1, 0.5);
            scale *= 1.8;
        }
        
        // Draw intricate interlocking struts
        float strut = length(p.xz) - 0.08;
        float box = max(max(abs(p.x), abs(p.y)), abs(p.z)) - 0.2;
        
        // Combine shapes
        return min(strut, box) / scale; 
    }

    // Surface Normals for lighting
    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Camera Setup
        vec3 ro = vec3(0.0, 0.0, -3.8);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Interactive 3D Orbit Camera
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) {
            ro.yz *= rot((m.y - 0.5) * 2.0);
            ro.xz *= rot((m.x - 0.5) * 2.0);
            rd.yz *= rot((m.y - 0.5) * 2.0);
            rd.xz *= rot((m.x - 0.5) * 2.0);
        }
        
        // Auto-wobble
        ro.xz *= rot(sin(uTime * 0.5) * 0.1);
        rd.xz *= rot(sin(uTime * 0.5) * 0.1);
        
        // Raymarching variables
        float dTotal = 0.0;
        float d;
        vec3 p;
        
        // Glow accumulators
        float mechanicalGlow = 0.0;
        float coreGlow = 0.0;
        
        // Raymarching Loop
        for(int i = 0; i < 120; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Accumulate volumetric energy based on proximity to the fractal surfaces
            mechanicalGlow += 0.005 / (0.01 + abs(d)) * exp(-dTotal * 0.5); 
            
            // Accumulate intense energy at the physical center of the mechanism (0,0,0)
            coreGlow += 0.008 / (0.02 + abs(d)) * exp(-length(p) * 2.0); 
            
            if(d < 0.001 || dTotal > 12.0) break;
            dTotal += d * 0.8; // Dampen step size for high-frequency KIFS details
        }
        
        // Void Space Background
        vec3 col = vec3(0.01, 0.01, 0.02); 
        
        // Surface Rendering
        if(dTotal < 12.0) {
            vec3 n = getNormal(p);
            
            // Dynamic Lighting
            vec3 l = normalize(vec3(sin(uTime), 2.0, -2.0));
            float diff = max(dot(n, l), 0.0);
            
            // Brass/Gold Mechanical Albedo
            vec3 albedo = vec3(0.15, 0.1, 0.02);
            col = albedo * (diff * 0.8 + 0.2);
            
            // Intense Specular Reflection
            vec3 ref = reflect(rd, n);
            float spec = pow(max(dot(ref, l), 0.0), 32.0);
            col += spec * vec3(1.0, 0.8, 0.5) * 1.5;
            
            // Add Fresnel Edge Lighting
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            col += vec3(0.0, 0.5, 1.0) * fresnel * 0.5;
        }
        
        // Combine Volumetric Neon Energy
        col += vec3(0.0, 0.8, 1.0) * mechanicalGlow * 0.15; // Cyan mechanical strut energy
        col += vec3(1.0, 0.5, 0.0) * coreGlow * 2.0;        // Blinding golden/orange core engine
        col += vec3(1.0, 0.9, 0.5) * pow(coreGlow * 0.5, 2.0); // White-hot center
        
        // Cinematic Post-Processing
        col *= 1.0 - dot(uv, uv) * 0.4; // Vignette
        col = pow(col, vec3(0.85)); // Gamma Correction
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const ChronoCoreHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#020204] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 2, 4, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
