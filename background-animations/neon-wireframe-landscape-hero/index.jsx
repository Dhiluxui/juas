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
  color1 = '#ff00aa',
  color2 = '#00aaff',
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
    uniform vec3 uColor1; // Neon Pink
    uniform vec3 uColor2; // Neon Cyan

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p = p * 2.02;
        f += 0.2500 * noise(p); p = p * 2.03;
        f += 0.1250 * noise(p); p = p * 2.01;
        f += 0.0625 * noise(p);
        return f;
    }

    // Terrain SDF
    float map(vec3 p) {
        // Flat center path, mountainous sides
        float sideMountains = smoothstep(2.0, 10.0, abs(p.x));
        
        // Displace Y based on noise
        float h = fbm(p.xz * 0.2) * 5.0 * sideMountains;
        
        // Add a central canyon
        h -= smoothstep(5.0, 0.0, abs(p.x)) * 1.5;
        
        return p.y - h + 3.0; // Base height offset
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.05, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera flies forward
        vec3 ro = vec3(0.0, 0.0, uTime * uSpeed * 8.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Mouse interact
        float pan = (m.x - 0.5) * 1.0;
        float tilt = (m.y - 0.5) * 1.0;
        rd.yz *= rot(tilt - 0.2); // Look down slightly
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            if(d < 0.01 || dTotal > 80.0) break;
            dTotal += d * 0.7; // Smaller step due to heightmap
        }
        
        // Synthwave Sky Background
        vec3 skyCol = vec3(0.02, 0.0, 0.05); // Dark purple sky
        
        // Sun at horizon
        float sunMask = smoothstep(0.15, 0.14, length(uv - vec2(0.0, 0.1)));
        
        // Sun grid cutouts
        float sunGrid = smoothstep(0.4, 0.5, sin(uv.y * 100.0 - uTime * 2.0));
        vec3 sunCol = mix(uColor1, vec3(1.0, 0.8, 0.0), uv.y * 2.0 + 0.5);
        
        skyCol += sunCol * sunMask * sunGrid;
        
        // Sky glow
        skyCol += uColor1 * smoothstep(0.5, 0.0, length(uv - vec2(0.0, 0.1))) * 0.5;
        
        vec3 col = skyCol;
        
        if (dTotal < 80.0) {
            // Draw the terrain
            vec3 n = getNormal(p);
            
            // Wireframe grid effect based on world position
            vec2 grid = fract(p.xz);
            // Thick lines
            float lineW = 0.05;
            float lines = smoothstep(lineW, 0.0, grid.x) + smoothstep(1.0-lineW, 1.0, grid.x) +
                          smoothstep(lineW, 0.0, grid.y) + smoothstep(1.0-lineW, 1.0, grid.y);
            
            // Base dark terrain
            col = vec3(0.01, 0.0, 0.02);
            
            // Add grid glow
            // Grid color fades from Cyan in center to Pink on mountains
            vec3 gridCol = mix(uColor2, uColor1, smoothstep(0.0, 10.0, abs(p.x)));
            
            // Grid pulses
            float pulse = sin(p.z * 0.5 - uTime * 5.0) * 0.5 + 0.5;
            
            col += gridCol * clamp(lines, 0.0, 1.0) * (0.5 + pulse * 0.5);
            
            // Add distance fog to blend into sky
            float fog = smoothstep(20.0, 80.0, dTotal);
            col = mix(col, skyCol, fog);
        }
        
        // Overall grading
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const NeonWireframeLandscapeHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#020005] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ff00aa"
        color2="#00aaff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(2, 0, 5, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
