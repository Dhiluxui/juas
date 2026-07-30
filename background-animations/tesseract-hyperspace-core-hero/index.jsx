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
  color1 = '#bb00ff', // Hyperspace Purple
  color2 = '#00ffcc', // Energy Cyan
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

    // 4D Rotation in 3D projection (Tesseract effect)
    vec3 rotate4D(vec3 p, float t) {
        // Pseudo 4D rotation by mixing axes with time
        float s = sin(t);
        float c = cos(t);
        vec3 q = p;
        // W-axis projection simulation
        float w = q.x * s + q.z * c;
        q.x = q.x * c - q.z * s;
        q.z = w;
        
        // Scale pulse based on 4th dimension
        q *= 1.0 + sin(uTime * 2.0) * 0.1;
        
        return q;
    }

    float sdBoxFrame( vec3 p, vec3 b, float e ) {
        p = abs(p)-b;
        vec3 q = abs(p+e)-e;
        return min(min(
            length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
            length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
            length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
    }

    float map(vec3 p) {
        // Tesseract Core
        vec3 rp = rotate4D(p, uTime * uSpeed * 0.5);
        rp.xy *= rot(uTime * 0.3);
        rp.yz *= rot(uTime * 0.4);
        
        // Outer Cube Frame
        float outer = sdBoxFrame(rp, vec3(1.0), 0.05);
        
        // Inner inverted cube frame (Hypercube projection)
        float innerScale = 0.5 + sin(uTime) * 0.2;
        float inner = sdBoxFrame(rp, vec3(innerScale), 0.05);
        
        // Connecting struts (simplified as intersecting boxes)
        vec3 q = abs(rp);
        float struts = max(max(q.x, q.y), q.z) - 1.0; 
        // Just roughing in the connecting lines for the Tesseract
        float crossBars = min(length(rp.xy) - 0.02, min(length(rp.yz) - 0.02, length(rp.xz) - 0.02));
        
        return min(min(outer, inner), crossBars);
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

        vec3 ro = vec3(0.0, 0.0, 3.5);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 4.0;
        float tilt = (m.y - 0.5) * 4.0;
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan);
        rd.xz *= rot(pan);
        
        // We will do a volumetric pass and a gravitational lensing pass!
        // Gravitational Lensing (Black hole math)
        // Deflect rays that pass near the origin
        
        float dTotal = 0.0;
        vec3 p = ro;
        float glow = 0.0;
        
        for(int i = 0; i < 80; i++) {
            // Gravitational lens deflection
            float r = length(p);
            // Deflect ray towards origin based on inverse square law
            if (r > 0.1) {
                vec3 gravity = -normalize(p) * (0.05 / (r * r));
                rd = normalize(rd + gravity * 0.1); // Small step bending
            }
            
            float d = map(p);
            
            // Volumetric glow accumulation inside the core
            glow += 0.01 / (abs(d) + 0.01) * exp(-dTotal * 0.5);
            
            if(d < 0.001 || dTotal > 10.0) break;
            
            // Step forward along bent ray
            p += rd * d;
            dTotal += d;
        }
        
        // Hyperspace Background
        // A swirling vortex of energy based on the bent ray direction
        float swirl = sin(atan(rd.z, rd.x) * 5.0 + uTime + rd.y * 10.0);
        vec3 bgCol = mix(vec3(0.02, 0.0, 0.05), uColor1 * 0.2, swirl * 0.5 + 0.5);
        
        // Stars smeared by hyperspace speed
        float stars = fract(sin(dot(rd.xy * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
        if (stars > 0.98) bgCol += uColor2 * (stars - 0.98) * 50.0 * abs(rd.z);
        
        vec3 col = bgCol;
        
        if (dTotal < 10.0) {
            vec3 n = getNormal(p);
            
            // Core material is pure energy
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 1.5);
            
            vec3 coreCol = mix(uColor1, uColor2, sin(p.x * 5.0 + uTime) * 0.5 + 0.5);
            col = coreCol * fresnel * 2.0;
            
            // Add a bright white inner core
            col += vec3(1.0) * pow(fresnel, 4.0);
        }
        
        // Add volumetric glow around the tesseract
        col += mix(uColor1, uColor2, 0.5) * glow;
        
        // Chromatic aberration from gravitational lensing
        col.r += glow * 0.1;
        col.b -= glow * 0.1;
        
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const TesseractHyperspaceCoreHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#05000a] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#bb00ff"
        color2="#00ffcc"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(5, 0, 10, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
