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

    // 2D Rotation Matrix
    mat2 rot(float a) { 
        return mat2(cos(a), -sin(a), sin(a), cos(a)); 
    }

    // 2D Hash function
    float hash(vec2 p) { 
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); 
    }
    
    // 2D Value Noise
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // Fractal Brownian Motion (FBM) for complex terrain height
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 5; i++) {
            v += a * noise(p); 
            p = r * p * 2.0; 
            a *= 0.5;
        }
        return v;
    }

    // Map the 3D Holographic Terrain Distance Field
    float map(vec3 p) {
        float t = uTime * 0.4;
        
        // Base smooth terrain height from FBM, scrolling continuously forward
        float h = fbm(p.xz * 0.4 - vec2(0.0, t));
        h = h * h * 5.0; // Square the height to create steeper mountains and flatter valleys
        
        // Create physical, stepped terraces (topographic contour lines in the geometry itself)
        float steps = 5.0;
        float hStepped = floor(h * steps) / steps;
        
        // Blend between smooth and stepped geometry for a hybrid digital landscape
        return p.y + mix(h, hStepped, 0.5);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // High altitude camera looking down at the landscape
        vec3 ro = vec3(0.0, 3.5, -4.5);
        vec3 rd = normalize(vec3(uv.x, uv.y - 0.45, 1.0));
        
        // Interactive Hologram Orbit via Mouse
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) {
            ro.xz *= rot((m.x - 0.5) * 2.0);
            rd.xz *= rot((m.x - 0.5) * 2.0);
            rd.yz *= rot((m.y - 0.5) * 1.5);
        }
        
        // Subtle automatic cinematic panning
        ro.xz *= rot(sin(uTime * 0.1) * 0.3);
        rd.xz *= rot(sin(uTime * 0.1) * 0.3);
        
        // Raymarching variables
        float dTotal = 0.0;
        vec3 p;
        
        // Deep synthwave space void
        vec3 col = vec3(0.01, 0.005, 0.02);
        
        // Raymarching Loop (Volumetric Hologram Style)
        for(int i = 0; i < 100; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // If the ray is very close to the surface, accumulate glowing contour lines
            if (d < 0.05) {
                // Recalculate raw continuous height to draw the lines
                float rawH = fbm(p.xz * 0.4 - vec2(0.0, uTime * 0.4)) * 5.0;
                
                // 1. Topography Contour Lines (High frequency)
                float steps = 18.0;
                float lineDist = fract(rawH * steps);
                float line = smoothstep(0.08, 0.0, lineDist);
                
                // 2. Data Grid Lines
                float gridX = fract(p.x * 2.0);
                float gridZ = fract(p.z * 2.0 - uTime * 2.0);
                float grid = smoothstep(0.03, 0.0, gridX) + smoothstep(0.03, 0.0, gridZ);
                
                // 3. Dot Matrix Data Points at grid intersections
                float dots = smoothstep(0.08, 0.0, length(vec2(gridX - 0.5, gridZ - 0.5)));
                
                // Dynamic Neon Color Palette based on Elevation
                vec3 neon = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.8), rawH / 5.0);
                
                // Blend holographic layers
                float alpha = (line * 0.8 + grid * 0.3 + dots * 0.6);
                
                // Volumetric Accumulation based on depth
                col += neon * alpha * 0.08 * exp(-dTotal * 0.04);
            }
            
            // Step forward. Since it's a hologram, we never break, we just step THROUGH the entire volume.
            // Slow down near the surface to gather more light, speed up in empty space
            dTotal += max(abs(d) * 0.5, 0.05);
            
            // Far clipping plane
            if(dTotal > 45.0) break;
        }
        
        // Gamma and Tone Mapping
        col = pow(col, vec3(0.85));
        
        // Radial Vignette
        col *= 1.0 - dot(uv, uv) * 0.4;
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const NeonTopographyHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#020104] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 1, 4, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
