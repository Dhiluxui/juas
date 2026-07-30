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

    // 2D Rotation matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Seamless polar repetition for absolute radial symmetry (Mandala Effect)
    vec2 modPolar(vec2 p, float repetitions) {
        float angle = 6.2831853 / repetitions;
        float a = atan(p.y, p.x) + angle/2.0;
        float r = length(p);
        a = mod(a, angle) - angle/2.0;
        return vec2(cos(a), sin(a)) * r;
    }

    // Distance to a 3D box
    float sdBox(vec3 p, vec3 b) {
      vec3 d = abs(p) - b;
      return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
    }

    // Map the intricate geometric structure
    float map(vec3 p) {
        float d = 100.0;
        float t = uTime * 0.3;
        
        // 0. Central Core (Pulsing Sphere)
        float core = length(p) - 0.3 + sin(uTime * 4.0) * 0.05;
        d = min(d, core);
        
        // 1. Layer 1: Inner Octagonal Gear (Rotates Clockwise)
        vec3 p1 = p;
        p1.xy *= rot(t * 1.5);
        p1.xy = modPolar(p1.xy, 8.0);
        p1.x -= 1.0;
        float l1 = sdBox(p1, vec3(0.3, 0.05, 0.1));
        d = min(d, l1);
        
        // 2. Layer 2: Intersecting Hexagons (Rotates Counter-Clockwise)
        vec3 p2 = p;
        p2.xy *= rot(-t * 0.8);
        p2.xy = modPolar(p2.xy, 6.0);
        p2.x -= 2.0;
        p2.xz *= rot(3.1415 / 4.0); // Tilt the geometry on the Z axis
        float l2 = sdBox(p2, vec3(0.5, 0.02, 0.2));
        d = min(d, l2);
        
        // 3. Layer 3: Outer Complex Ring (24-fold symmetry, Rotates slowly Clockwise)
        vec3 p3 = p;
        p3.xy *= rot(t * 0.4);
        p3.xy = modPolar(p3.xy, 24.0);
        p3.x -= 3.5;
        p3.xz *= rot(3.1415 / 4.0); // Create diamond shapes along the edge
        float l3 = sdBox(p3, vec3(0.2, 0.05, 0.2));
        
        // Thin connecting neon ring
        float ring = length(vec2(length(p.xy) - 3.5, p.z)) - 0.015;
        
        d = min(d, min(l3, ring));
        
        return d;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Camera setup (looking down the Z-axis at the mandala)
        vec3 ro = vec3(0.0, 0.0, -9.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Smooth 3D Parallax Tilt with Mouse
        vec2 m = uMouse / uResolution;
        if (length(uMouse) > 10.0) {
            ro.yz *= rot((m.y - 0.5) * 1.2);
            ro.xz *= rot((m.x - 0.5) * 1.2);
            rd.yz *= rot((m.y - 0.5) * 1.2);
            rd.xz *= rot((m.x - 0.5) * 1.2);
        }
        
        // Subtle automatic cinematic tilt
        ro.yz *= rot(-0.4);
        rd.yz *= rot(-0.4);
        ro.xz *= rot(sin(uTime * 0.3) * 0.2);
        rd.xz *= rot(sin(uTime * 0.3) * 0.2);
        
        float dTotal = 0.0;
        vec3 p;
        
        // Volumetric glow accumulators separated by layer
        float glowCore = 0.0;
        float glowL1 = 0.0;
        float glowL2 = 0.0;
        float glowL3 = 0.0;
        
        // Raymarching Loop
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Re-evaluate layers to accumulate specific colored glow based on proximity
            float t = uTime * 0.3;
            
            float core = length(p) - 0.3;
            
            vec3 p1 = p; p1.xy *= rot(t * 1.5); p1.xy = modPolar(p1.xy, 8.0); p1.x -= 1.0;
            float l1 = sdBox(p1, vec3(0.3, 0.05, 0.1));
            
            vec3 p2 = p; p2.xy *= rot(-t * 0.8); p2.xy = modPolar(p2.xy, 6.0); p2.x -= 2.0; p2.xz *= rot(3.1415/4.0);
            float l2 = sdBox(p2, vec3(0.5, 0.02, 0.2));
            
            vec3 p3 = p; p3.xy *= rot(t * 0.4); p3.xy = modPolar(p3.xy, 24.0); p3.x -= 3.5; p3.xz *= rot(3.1415/4.0);
            float l3 = sdBox(p3, vec3(0.2, 0.05, 0.2));
            
            // Accumulate exponential glow (bloom) around the structures
            glowCore += 0.006 / (0.01 + abs(core));
            glowL1 += 0.005 / (0.01 + abs(l1));
            glowL2 += 0.004 / (0.01 + abs(l2));
            glowL3 += 0.003 / (0.01 + abs(l3));
            
            // Ray collision or far clip
            if (d < 0.001 || dTotal > 15.0) break;
            
            dTotal += d * 0.8; // Dampen step size for accuracy on geometric edges
        }
        
        vec3 col = vec3(0.01, 0.01, 0.03); // Deep space void
        
        // Apply highly vibrant neon colors to the accumulated volumetric fields
        col += vec3(1.0, 0.1, 0.6) * glowCore; // Hot pink pulsing core
        col += vec3(0.0, 1.0, 0.8) * glowL1;   // Cyan inner ring
        col += vec3(0.6, 0.0, 1.0) * glowL2;   // Deep purple intersecting hexagons
        col += vec3(1.0, 0.8, 0.0) * glowL3;   // Golden complex outer rim
        
        // Add a blinding white core energy burst
        col += vec3(1.0) * pow(glowCore * 0.2, 4.0);
        
        // Post-Processing
        col = pow(col, vec3(0.9)); // Gamma correction
        col *= 1.0 - dot(uv, uv) * 0.4; // Vignette falloff
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const NeonMandalaHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#010103] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(1, 1, 3, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
