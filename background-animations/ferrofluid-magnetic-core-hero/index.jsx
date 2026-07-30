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
  color1 = '#ffffff', // Highlight color (Iridescence base)
  color2 = '#4400ff', // Base glow
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

    // Smooth min for merging shapes (metaballs)
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // 3D Noise for spike displacement
    float hash(vec3 p) {
        p = fract(p * vec3(123.34, 456.21, 789.92));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y * p.z);
    }
    
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(p+vec3(0,0,0)), hash(p+vec3(1,0,0)),f.x),
                       mix(hash(p+vec3(0,1,0)), hash(p+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(p+vec3(0,0,1)), hash(p+vec3(1,0,1)),f.x),
                       mix(hash(p+vec3(0,1,1)), hash(p+vec3(1,1,1)),f.x),f.y),f.z);
    }

    float fbm(vec3 p) {
        float f = 0.0;
        f += 0.5000*noise(p); p = p*2.02;
        f += 0.2500*noise(p); p = p*2.03;
        f += 0.1250*noise(p);
        return f;
    }

    // SDF for the Ferrofluid
    float map(vec3 p) {
        // Base sphere
        float d = length(p) - 1.5;
        
        // Add huge spikes that move
        // Convert to spherical coords for spike distribution
        vec3 np = normalize(p);
        
        // Displacement map based on high-frequency noise that moves over time
        float spikes = fbm(np * 4.0 + uTime * uSpeed) * 1.5;
        // Make the spikes sharp by modifying the noise curve
        spikes = pow(spikes, 3.0) * 3.0;
        
        // Add dynamic magnetic pulling (some spikes grow huge)
        float pull = sin(np.y * 5.0 + uTime * 2.0) * sin(np.x * 4.0 + uTime) * 0.5;
        
        // Combine base sphere with displacement
        d -= spikes * 0.3;
        d -= pull * 0.2;
        
        // Add a smaller orbiting magnet that pulls the fluid
        vec3 magnetPos = vec3(sin(uTime) * 2.5, cos(uTime*1.3) * 1.5, cos(uTime) * 2.5);
        float dMagnet = length(p - magnetPos) - 0.3;
        
        // Smoothly merge the main blob with the orbiting magnet
        return smin(d, dMagnet, 0.8);
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    // Environment map for reflections
    vec3 getEnv(vec3 dir) {
        // Create a fake studio lighting environment
        float y = dir.y * 0.5 + 0.5;
        vec3 bg = mix(vec3(0.02, 0.0, 0.05), vec3(0.0, 0.0, 0.0), y);
        
        // Add bright strip lights
        float strip1 = smoothstep(0.98, 1.0, sin(dir.x * 10.0));
        float strip2 = smoothstep(0.98, 1.0, sin(dir.z * 10.0));
        bg += uColor1 * strip1 * max(0.0, dir.y);
        bg += uColor2 * strip2 * max(0.0, dir.y);
        
        return bg;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        vec3 ro = vec3(0.0, 0.0, -5.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 4.0;
        float tilt = (m.y - 0.5) * 4.0;
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan + uTime * 0.2);
        rd.xz *= rot(pan + uTime * 0.2);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        
        for(int i = 0; i < 100; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            if(d < 0.001 || dTotal > 20.0) break;
            dTotal += d * 0.6; // Small step for displacement
        }
        
        vec3 bg = getEnv(rd);
        vec3 col = bg;
        
        if (dTotal < 20.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Highly reflective material
            vec3 ref = reflect(rd, n);
            vec3 env = getEnv(ref);
            
            // Fresnel
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            
            // Iridescence (oil slick effect on the metal)
            float viewAngle = max(dot(n, v), 0.0);
            // Cycle through colors based on view angle and normal
            vec3 iridescence = 0.5 + 0.5 * cos(uTime + viewAngle * 10.0 + p.yxy * 2.0 + vec3(0,2,4));
            
            // Combine jet black base with reflections and iridescence
            vec3 baseCol = vec3(0.02);
            col = baseCol;
            col += env * 1.5; // Strong reflections
            col += iridescence * fresnel * 1.5; // Rainbow edges
            
            // Tiny white specular highlights from imaginary lights
            vec3 l = normalize(vec3(1.0, 1.0, -1.0));
            vec3 h = normalize(l + v);
            float spec = pow(max(dot(n, h), 0.0), 128.0);
            col += uColor1 * spec * 2.0;
        }
        
        // Depth of field / blur back into background
        col = mix(col, bg, smoothstep(5.0, 15.0, dTotal));
        
        col = pow(col, vec3(1.0 / 2.2)); // Gamma
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const FerrofluidMagneticCoreHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#030005] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ffffff"
        color2="#4400ff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(3, 0, 5, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
