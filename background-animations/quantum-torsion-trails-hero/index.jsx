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

    mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

    float sdTorus(vec3 p, vec2 t) { 
        vec2 q = vec2(length(p.xz)-t.x, p.y); 
        return length(q) - t.y; 
    }

    // A particle accelerator ring network
    float map(vec3 p) {
        float d = 100.0;
        
        // Create 3 massive intersecting containment rings
        for(int i = 0; i < 3; i++) {
            vec3 q = p;
            
            // Rotate each ring on a completely different axis
            if (i == 0) { q.xy *= rot(uTime * 0.2); q.yz *= rot(0.5); }
            if (i == 1) { q.xz *= rot(uTime * 0.3); q.xy *= rot(1.0); }
            if (i == 2) { q.yz *= rot(uTime * 0.4); q.xz *= rot(1.5); }
            
            // Draw the physical metal ring tube
            float ring = sdTorus(q, vec2(3.0, 0.1));
            
            d = min(d, ring);
        }
        
        return d;
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p+e.xyy)-map(p-e.xyy), 
            map(p+e.yxy)-map(p-e.yxy), 
            map(p+e.yyx)-map(p-e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        vec3 ro = vec3(0.0, 0.0, -8.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) { 
            ro.yz *= rot((m.y - 0.5)*2.0); ro.xz *= rot((m.x - 0.5)*2.0); 
            rd.yz *= rot((m.y - 0.5)*2.0); rd.xz *= rot((m.x - 0.5)*2.0); 
        }
        
        rd.xy *= rot(uTime * 0.1); // Camera roll
        
        float dTotal = 0.0;
        vec3 p;
        
        // Volumetric particles racing through the tubes
        float trails = 0.0;
        
        for(int i = 0; i < 80; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Calculate the internal hollow space of the rings to render the energy trails
            for(int j = 0; j < 3; j++) {
                vec3 q = p;
                if (j == 0) { q.xy *= rot(uTime * 0.2); q.yz *= rot(0.5); }
                if (j == 1) { q.xz *= rot(uTime * 0.3); q.xy *= rot(1.0); }
                if (j == 2) { q.yz *= rot(uTime * 0.4); q.xz *= rot(1.5); }
                
                // Hollow center of the tube
                float hollow = sdTorus(q, vec2(3.0, 0.05));
                
                // If the ray is passing inside or very near the hollow tube, light it up
                if (abs(hollow) < 0.2) {
                    // Calculate polar angle to make a "comet" trail race around the ring
                    float angle = atan(q.z, q.x);
                    
                    // High speed rotation
                    float speed = uTime * (10.0 + float(j) * 5.0);
                    float trailPhase = fract((angle - speed) / 6.28318);
                    
                    // Sharp comet head, long fading tail
                    float trailIntensity = exp(-trailPhase * 10.0) * 10.0;
                    
                    trails += trailIntensity / (0.01 + abs(hollow)) * 0.001;
                }
            }
            
            if(d < 0.01 || dTotal > 20.0) break;
            dTotal += d;
        }
        
        vec3 col = vec3(0.0);
        
        if (dTotal < 20.0) {
            vec3 n = getNormal(p);
            
            // Black metallic containment rings
            col = vec3(0.01, 0.01, 0.02);
            
            // External studio lighting
            vec3 l = normalize(vec3(1.0, 1.0, -1.0));
            float diff = max(dot(n, l), 0.0);
            
            vec3 ref = reflect(rd, n);
            float spec = pow(max(dot(ref, l), 0.0), 32.0);
            
            col += vec3(0.1, 0.2, 0.3) * diff;
            col += vec3(1.0) * spec * 0.5;
            
            // Fresnel edge lighting from the escaping energy
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
            col += vec3(0.0, 1.0, 1.0) * fresnel * 1.5;
        }
        
        // Add the blinding, high-speed energy trails
        vec3 trailColor = vec3(0.0, 1.0, 1.0); // Neon cyan
        col += trailColor * trails;
        
        col = mix(col, vec3(0.0), smoothstep(10.0, 20.0, dTotal)); // Dark background
        
        col = pow(col, vec3(0.85)); // Gamma
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const QuantumTorsionTrailsHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
