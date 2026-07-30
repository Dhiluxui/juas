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
  color1 = '#ff5500',
  color2 = '#ff0000',
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

    // Star surface noise (Simplex/FBM approximation)
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
        f += 0.1250*noise(p); p = p*2.01;
        f += 0.0625*noise(p);
        return f;
    }

    // Coronal Magnetic Flux Tubes (Torus rings wrapped around the star)
    float sdTorus(vec3 p, vec2 t) {
        vec2 q = vec2(length(p.xz)-t.x,p.y);
        return length(q)-t.y;
    }

    // Geometry Map
    float map(vec3 p) {
        // Core Star Sphere
        float starRadius = 2.0;
        
        // Add extreme boiling noise to the surface
        float boil = fbm(p * 2.0 - vec3(0.0, uTime * uSpeed * 2.0, 0.0)) * 0.4;
        float dStar = length(p) - starRadius + boil;
        
        // Magnetic Flux Tubes (Coronal Loops)
        vec3 tp = p;
        // Rotate the loops wildly
        tp.xy *= rot(uTime * 0.2);
        tp.yz *= rot(uTime * 0.15);
        
        // Multiple looping arcs
        float dLoop1 = sdTorus(tp - vec3(0.0, 1.5, 0.0), vec2(1.5, 0.05));
        
        tp.xz *= rot(1.57); // 90 degrees
        float dLoop2 = sdTorus(tp + vec3(1.5, 0.0, 0.0), vec2(2.0, 0.03));
        
        // Add noise to the magnetic tubes so they aren't perfect rings
        float loopNoise = fbm(p * 5.0 + uTime) * 0.1;
        dLoop1 += loopNoise;
        dLoop2 += loopNoise;
        
        // Combine (using min for distinct objects)
        float loops = min(dLoop1, dLoop2);
        
        // Soft blend the loops into the star
        return min(dStar, max(loops, length(p) - starRadius - 0.2)); // Cut off loops inside the star
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.02, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera
        vec3 ro = vec3(0.0, 0.0, -6.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 4.0;
        float tilt = (m.y - 0.5) * 4.0;
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan + uTime * 0.1);
        rd.xz *= rot(pan + uTime * 0.1);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        
        // Plasma accumulation
        float plasmaGlow = 0.0;
        float coronaGlow = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Collect volumetric plasma along the magnetic lines
            if(d > 0.0 && d < 0.3) {
                plasmaGlow += 0.01 / (d + 0.01) * exp(-dTotal * 0.2);
            }
            
            // Corona glow around the entire star
            float distToCenter = length(p);
            if(distToCenter > 2.0 && distToCenter < 4.0) {
                coronaGlow += 0.005 * exp(-(distToCenter - 2.0) * 2.0);
            }
            
            if(d < 0.002 || dTotal > 15.0) break;
            dTotal += d * 0.8; // Step carefully through noise
        }
        
        // Deep space background
        vec3 col = vec3(0.01, 0.0, 0.0);
        
        if (dTotal < 15.0) {
            vec3 n = getNormal(p);
            
            // The star is self-illuminating, but we use the normal to map color gradients
            float surfaceHeat = fbm(p * 3.0 - uTime * 3.0);
            
            // Mix from Dark Red to Bright Yellow/White based on heat noise
            vec3 starCol = mix(uColor2, uColor1, surfaceHeat);
            
            // Add extreme brightness at the edges (limb darkening/brightening depending on star type)
            float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
            starCol += uColor1 * rim;
            
            col = starCol;
        }
        
        // Add Plasma loops
        col += uColor1 * plasmaGlow * 1.5;
        
        // Add Corona
        col += mix(uColor2, uColor1, 0.5) * coronaGlow * 3.0;
        
        // Post Process (Lens flare / bloom)
        col *= 1.2 - dot(uv, uv) * 0.8;
        col = pow(col, vec3(1.0 / 2.2)); // Gamma
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const StellarMagnetosphereHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#050000] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ffaa00"
        color2="#660000"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
