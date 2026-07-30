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
  color1 = '#33ff00', // Virus Green
  color2 = '#00bbff', // Host Cyan
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
    uniform vec3 uColor1; // Virus Green
    uniform vec3 uColor2; // Host Cyan

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    float hash(vec3 p) {
        p = fract(p * vec3(123.34, 456.21, 789.92));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y * p.z);
    }

    // 3D Cellular Grid
    float map(vec3 p) {
        vec3 id = floor(p);
        vec3 q = fract(p) - 0.5;
        
        float h = hash(id);
        
        // Size varies based on time and position to simulate infection spreading
        // The "infection front" moves along the Z axis
        float infectionLevel = smoothstep(-2.0, 2.0, p.z - uTime * uSpeed * 2.0);
        
        // Host cells are smooth and calm
        float hostRadius = 0.2 + 0.1 * sin(uTime + h * 10.0);
        
        // Virus cells are sharp, jittery, and larger
        float virusRadius = 0.3 + 0.15 * sin(uTime * 10.0 + h * 20.0);
        
        // Lerp between host and virus based on infection front
        float currentRadius = mix(hostRadius, virusRadius, infectionLevel);
        
        // The virus cells jitter and break structure
        vec3 jitter = mix(vec3(0.0), (vec3(hash(id+1.0), hash(id+2.0), hash(id+3.0)) - 0.5) * 0.2, infectionLevel);
        
        // SDF for the cell
        return length(q + jitter) - currentRadius;
    }
    
    // We also need to map the color based on infection level
    float getInfectionLevel(vec3 p) {
        // Dynamic spreading wave along Z, with some noise on X and Y
        float noiseVal = sin(p.x * 2.0) * sin(p.y * 2.0) * 0.5;
        return smoothstep(-3.0, 1.0, p.z + noiseVal - uTime * uSpeed * 2.0);
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

        // Microscopic camera flying through the tissue
        vec3 ro = vec3(0.0, 0.0, uTime * uSpeed * 0.5 - 2.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Look around
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        float scatterGlow = 0.0;
        float virusGlow = 0.0;
        float hostGlow = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Volumetric lighting: Collect glow from the cells
            if (d < 0.2) {
                float inf = getInfectionLevel(p);
                // Virus glows intensely, host glows softly
                virusGlow += 0.02 * inf / (abs(d) + 0.02) * exp(-dTotal * 0.2);
                hostGlow += 0.01 * (1.0 - inf) / (abs(d) + 0.02) * exp(-dTotal * 0.2);
            }
            
            if(d < 0.001 || dTotal > 15.0) break;
            dTotal += d * 0.8; 
        }
        
        // Fluid background based on infection level at the far plane
        float bgInf = getInfectionLevel(ro + rd * 15.0);
        vec3 bgCol = mix(vec3(0.0, 0.02, 0.05), vec3(0.01, 0.05, 0.0), bgInf);
        
        vec3 col = bgCol;
        
        if (dTotal < 15.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            float inf = getInfectionLevel(p);
            
            // Fresnel rim lighting (microscopic translucent look)
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            
            // Combine host (Cyan) and virus (Green)
            vec3 cellCol = mix(uColor2, uColor1, inf);
            
            col = mix(bgCol, cellCol, 0.2); // Base
            col += cellCol * fresnel * 2.0;
            
            // Virus has high frequency pulsing on the surface
            if (inf > 0.5) {
                float pulse = sin(p.x * 20.0 + uTime * 10.0) * sin(p.y * 20.0) * 0.5 + 0.5;
                col += uColor1 * pulse * fresnel * inf;
            }
        }
        
        // Add volumetric glow
        col += uColor2 * hostGlow;
        col += uColor1 * virusGlow * 1.5; // Virus glow is stronger
        
        // Depth of field blur (fade into the fluid)
        col = mix(col, bgCol, smoothstep(8.0, 15.0, dTotal));
        
        // High contrast cinematic color grading
        col = pow(col, vec3(1.0 / 1.8)); // Harder gamma for punchy neon colors
        col *= 1.2 - dot(uv, uv) * 1.0; // Heavy vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const BioDigitalVirusInfectionHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#000502] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#33ff00"
        color2="#00bbff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(0, 5, 2, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
