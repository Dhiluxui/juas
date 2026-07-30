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
  color1 = '#ff2255',
  color2 = '#ff8844',
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
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }
    
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    float hash(vec3 p) {
        p = fract(p * vec3(234.34, 435.12, 123.98));
        p += dot(p, p + 54.32);
        return fract(p.x * p.y * p.z);
    }

    // Microscopic organic environment
    float map(vec3 p) {
        // Endless repeating cells in a 3D grid
        vec3 id = floor(p * 0.5);
        vec3 q = fract(p * 0.5) * 2.0 - 1.0; // Local cell space
        
        float d = 100.0;
        
        // Check neighboring cells to allow blobs to merge across boundaries
        for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
        for(int z = -1; z <= 1; z++) {
            vec3 offset = vec3(float(x), float(y), float(z));
            vec3 neighborId = id + offset;
            
            // Random offset for each cell based on ID
            vec3 rOffset = vec3(hash(neighborId), hash(neighborId + 10.0), hash(neighborId + 20.0)) * 2.0 - 1.0;
            
            // Cell moves around randomly in its domain
            float t = uTime * uSpeed * 0.5 + hash(neighborId) * 100.0;
            vec3 move = vec3(sin(t), cos(t*0.8), sin(t*1.2)) * 0.5;
            
            // Base sphere
            vec3 localP = q - offset * 2.0 - rOffset * 0.2 - move;
            
            // Cells "breathe" and warp
            float radius = 0.4 + sin(t * 3.0) * 0.1;
            float blob = length(localP) - radius;
            
            // Add tiny noise displacement to the cell surface
            blob -= sin(localP.x * 10.0 + uTime) * sin(localP.y * 10.0) * 0.05;
            
            // Smoothly merge all cells
            d = smin(d, blob, 0.8); // Huge k value for extremely viscous liquid merging
        }}}
        
        return d;
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

        // Microscopic camera
        vec3 ro = vec3(uTime * uSpeed * 0.5, 0.0, uTime * uSpeed * 0.2);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        float scatter = 0.0;
        
        for(int i = 0; i < 70; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Accumulate soft sub-surface scattering when passing closely through cell boundaries
            if (d < 0.3) {
                scatter += 0.01 / (abs(d) + 0.01) * exp(-dTotal * 0.2);
            }
            
            if(d < 0.01 || dTotal > 12.0) break;
            dTotal += d * 0.8; 
        }
        
        // Fluid background (microscope liquid)
        vec3 bgCol = mix(vec3(0.05, 0.0, 0.02), vec3(0.1, 0.0, 0.0), length(uv));
        vec3 col = bgCol;
        
        if (dTotal < 12.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Lighting from a microscope backlight
            vec3 l = normalize(vec3(0.0, 0.0, 1.0));
            float diff = max(dot(n, l), 0.0);
            
            // Fresnel rim lighting (cells look translucent)
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.0);
            
            // Internal scattering color
            vec3 cellCol = mix(uColor1, uColor2, sin(p.y * 2.0)*0.5+0.5);
            
            col = cellCol * diff * 0.5;
            col += cellCol * fresnel * 1.5;
        }
        
        // Add volumetric subsurface glow
        col += mix(uColor1, uColor2, 0.5) * scatter * 1.5;
        
        // Microscopic Depth of field blur (fade distant objects heavily into fluid)
        float focus = smoothstep(6.0, 12.0, dTotal);
        col = mix(col, bgCol, focus);
        
        // Floating particles (dust/blood cells in the fluid)
        float particles = fract(sin(dot(floor(uv * 100.0 + uTime), vec2(12.9898, 78.233))) * 43758.5453);
        if (particles > 0.99) {
            col += uColor1 * (1.0 - focus) * 0.5;
        }
        
        // Chromatic aberration at the edges of the lens
        float r = length(uv);
        col.r += smoothstep(0.5, 1.0, r) * 0.1;
        col.b -= smoothstep(0.5, 1.0, r) * 0.1;
        
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const MicroscopicCellMatrixHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#110005] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={0.5}
        color1="#ff2255"
        color2="#ff8844"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(17, 0, 5, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
