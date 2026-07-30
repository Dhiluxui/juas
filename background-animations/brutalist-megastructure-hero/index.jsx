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
  color1 = '#ffeedd', // Sunlight (Warm)
  color2 = '#0a101a', // Shadows (Cool/Concrete)
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
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
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

    let animationFrameId: number;
    let startTime = performance.now();
    let initialSet = false;

    const render = (time: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (uTimeLoc !== null) gl.uniform1f(uTimeLoc, t);
      if (uResolutionLoc !== null) gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      if (uMouseLoc !== null) gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
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
    uniform float uSpeed;
    uniform vec3 uColor1; // Light
    uniform vec3 uColor2; // Shadow

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Concrete Noise
    float hash(vec3 p) {
        p = fract(p * vec3(123.34, 456.21, 789.92));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y * p.z);
    }

    float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
    }

    // Huge repeating brutalist geometry
    float map(vec3 p) {
        // Create an endless grid of massive concrete pillars and floors
        vec3 q = p;
        
        // Repeat space on X and Z
        vec2 cell = floor(q.xz / 8.0);
        q.xz = mod(q.xz + 4.0, 8.0) - 4.0;
        
        // Huge central pillar in each cell
        float pillars = sdBox(q, vec3(1.5, 100.0, 1.5));
        
        // Add horizontal floors/catwalks
        vec3 fq = p;
        fq.y = mod(fq.y + 2.0, 4.0) - 2.0;
        
        // Some random gaps in the floors using the cell hash
        float floorMask = hash(vec3(cell.x, floor(p.y/4.0), cell.y));
        float floors = sdBox(fq, vec3(4.0, 0.2, 4.0));
        
        // Remove floors randomly to create light shafts
        if (floorMask > 0.6) floors = 100.0;
        
        return min(pillars, floors);
    }

    // We need a shadow marching function to calculate the God Rays
    float calcShadow(vec3 ro, vec3 rd) {
        float res = 1.0;
        float t = 0.05;
        for(int i = 0; i < 30; i++) {
            float h = map(ro + rd * t);
            res = min(res, 8.0 * h / t);
            t += h;
            if(res < 0.001 || t > 15.0) break;
        }
        return clamp(res, 0.0, 1.0);
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera moves extremely slowly to emphasize scale
        vec3 ro = vec3(2.0, uTime * uSpeed * 0.5, uTime * uSpeed * 1.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Look up at the skylights
        float pan = (m.x - 0.5) * 1.0;
        float tilt = (m.y - 0.5) * 1.0 + 0.5; // Look up by default
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        
        // Light direction (shafting through the ceiling gaps)
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        
        // Volumetric Light Accumulation (God Rays)
        float vLight = 0.0;
        
        for(int i = 0; i < 80; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Step carefully to allow volumetric sampling
            if(d < 0.01 || dTotal > 30.0) break;
            dTotal += d * 0.8;
            
            // Sample shadow ray from this point to accumulate dust light
            // (Keep iterations low for performance)
            if (i % 3 == 0) {
                float sha = calcShadow(p, lightDir);
                vLight += sha * 0.015 * exp(-dTotal * 0.1);
            }
        }
        
        vec3 col = uColor2; // Deep shadow background
        
        if (dTotal < 30.0) {
            vec3 n = getNormal(p);
            
            // Hard shadows
            float shadow = calcShadow(p + n * 0.02, lightDir);
            
            float diff = max(dot(n, lightDir), 0.0);
            
            // Concrete texture (noise)
            float tex = hash(p * 10.0) * 0.2 + 0.8;
            
            // Base concrete is dark
            vec3 concrete = uColor2 * 1.5 * tex;
            
            // Lit areas get the warm sunlight
            col = mix(concrete, uColor1 * tex, diff * shadow * 0.8);
            
            // Ambient occlusion (faked by distance and corners)
            float ao = clamp(map(p + n * 0.5) * 2.0, 0.0, 1.0);
            col *= ao;
        }
        
        // Add Volumetric God Rays
        col += uColor1 * vLight;
        
        // Dust motes floating in the light
        float dust = fract(sin(dot(floor(uv * 150.0 + uTime * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
        if (dust > 0.995 && vLight > 0.1) {
            col += uColor1 * 0.5;
        }
        
        // Cinematic fog in the distance
        col = mix(col, uColor2 * 0.5, smoothstep(15.0, 30.0, dTotal));
        
        col = pow(col, vec3(1.0 / 2.2)); // Gamma
        col *= 1.2 - dot(uv, uv) * 0.8; // Heavy Vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const BrutalistMegastructureHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#05080c] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={0.5}
        color1="#ffeedd"
        color2="#0a101a"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 8, 12, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
