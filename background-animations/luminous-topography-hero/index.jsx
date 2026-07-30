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
  color1 = '#00ffff',
  color2 = '#0055ff',
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

    // --- Noise & FBM ---
    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for(int i = 0; i < 5; i++) {
            f += amp * noise(p);
            p *= rot * 2.02;
            amp *= 0.5;
        }
        return f;
    }

    // --- Distance Field ---
    float map(vec3 p) {
        // Dynamic flowing terrain
        float n = fbm(p.xz * 0.3 + vec2(0.0, uTime * uSpeed * -0.5));
        
        // Add crystalline jagged peaks
        n += fbm(p.xz * 1.5 - vec2(uTime * 0.2, 0.0)) * 0.2;
        
        // Base plane
        return p.y + 1.0 - n * 1.5;
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    mat2 rotate2d(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera setup
        vec3 ro = vec3(0.0, 1.5, 0.0);
        vec3 rd = normalize(vec3(uv.x, uv.y - 0.2, 1.0));
        
        // Mouse camera interaction
        float panX = (m.x - 0.5) * 2.0;
        float tiltY = (m.y - 0.5) * 1.0;
        rd.yz *= rotate2d(tiltY * 0.5);
        rd.xz *= rotate2d(panX * 0.5);
        ro.xz *= rotate2d(panX * 0.5);
        
        // Endless forward movement
        ro.z -= uTime * uSpeed * 2.0;
        
        // Raymarching
        float dTotal = 0.0;
        float glow = 0.0;
        vec3 p;
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Accumulate cybernetic grid glow at specific elevations
            float elevation = p.y + 1.0;
            if(abs(d) < 0.2) {
                // Generate topographic contour lines based on height
                float contour = smoothstep(0.05, 0.0, abs(fract(p.y * 4.0) - 0.5));
                glow += contour * 0.02 / (abs(d) + 0.01) * exp(-dTotal * 0.05);
            }
            
            if(d < 0.001 || dTotal > 40.0) break;
            dTotal += d * 0.6; // Smaller step size for detailed displacement
        }
        
        // Base Void Color
        vec3 col = vec3(0.01, 0.02, 0.04);
        
        if (dTotal < 40.0) {
            vec3 n = getNormal(p);
            
            // Artificial directional light sweeping over terrain
            vec3 l = normalize(vec3(sin(uTime), 0.5, cos(uTime)));
            float diff = max(dot(n, l), 0.0);
            
            // Iridescent material properties
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            
            // Blend colors based on height
            vec3 terrainCol = mix(uColor2, uColor1, smoothstep(-0.5, 1.5, p.y));
            
            col = terrainCol * diff * 0.3; // Base diffuse
            col += uColor1 * fresnel * 0.5; // Edge glow
            
            // Distance fog
            col = mix(col, vec3(0.01, 0.02, 0.04), smoothstep(10.0, 40.0, dTotal));
        }
        
        // Add contour line glow
        col += uColor1 * glow * 1.5;
        
        // Sky box / ambient atmosphere
        vec3 atmosphere = mix(uColor2 * 0.1, vec3(0.0), uv.y + 0.5);
        if(dTotal >= 40.0) col += atmosphere;

        // Cinematic post-processing (Vignette & Contrast)
        col *= 1.0 - dot(uv, uv) * 0.5;
        col = smoothstep(0.0, 1.0, col);
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const LuminousTopographyHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#03060c] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.5}
        color1="#00ffff"
        color2="#ff00ff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(3, 6, 12, 0.8) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
