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
    
    // Distance field to a box
    float sdBox(vec3 p, vec3 b) { 
        vec3 q = abs(p) - b; 
        return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); 
    }
    
    // 1D Hash for pseudo-random data streams
    float hash(float n) { return fract(sin(n)*43758.5453); }

    // Map a massive fiber optic tunnel filled with racing data packets
    float map(vec3 p) {
        // Massive cylindrical data tunnel. We boolean subtract the interior to carve it out.
        float tunnel = -length(p.xy) + 4.0;
        
        // We use polar coordinates to array data streams 360-degrees around the tunnel walls
        float angle = atan(p.y, p.x);
        
        // Divide the circle into 24 distinct data lanes
        float segments = 24.0;
        float aId = floor(angle / (6.28318 / segments));
        
        // Z movement: Make the data stream forward toward the camera
        // Give each lane a completely random speed so they race past each other
        float speed = 10.0 + hash(aId) * 15.0; 
        float zPos = p.z + uTime * speed;
        
        // Spatial repetition along the Z axis to create packets
        float zSpacing = 4.0;
        float zId = floor(zPos / zSpacing);
        
        // Dropped Packets Algorithm: 
        // Randomly delete certain blocks based on their Grid ID to create a binary/morse code look
        float drop = hash(aId * 13.0 + zId * 7.1);
        
        if (drop > 0.4) {
            return tunnel; // Return empty space instead of a packet
        }
        
        // Convert back to cartesian coordinates to draw the physical packet box
        vec3 q = p;
        
        // Rotate q so the packet aligns perfectly flat against the curved tunnel wall
        float aCenter = (aId + 0.5) * (6.28318 / segments);
        q.xy *= rot(-aCenter);
        
        // Offset the box to stick to the wall (radius 4.0)
        q.x -= 4.0;
        
        // Apply spatial modulo along the Z axis
        q.z = mod(zPos, zSpacing) - zSpacing * 0.5;
        
        // The packet itself: A long glowing rectangular prism with random lengths
        float packet = sdBox(q, vec3(0.1, 0.3, 1.0 + hash(zId) * 0.8));
        
        // Merge the tunnel walls and the packets
        return min(tunnel, packet);
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p+e.xyy) - map(p-e.xyy), 
            map(p+e.yxy) - map(p-e.yxy), 
            map(p+e.yyx) - map(p-e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Flying perfectly down the center of the fiber optic cable
        vec3 ro = vec3(0.0, 0.0, 0.0);
        vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
        
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) { 
            ro.yz *= rot((m.y - 0.5)*2.0); ro.xz *= rot((m.x - 0.5)*2.0); 
            rd.yz *= rot((m.y - 0.5)*2.0); rd.xz *= rot((m.x - 0.5)*2.0); 
        }
        
        // Continuous camera barrel roll for velocity effect
        rd.xy *= rot(uTime * 0.5);
        
        float dTotal = 0.0;
        vec3 p;
        
        for(int i = 0; i < 70; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            if(d < 0.01 || dTotal > 50.0) break;
            dTotal += d;
        }
        
        vec3 col = vec3(0.0); // Pitch black core
        
        if (dTotal < 50.0) {
            vec3 n = getNormal(p);
            
            // Check if the ray hit a data packet or the empty tunnel wall
            // The tunnel is exactly at radius 4.0. If we are closer, it's a packet.
            float r = length(p.xy);
            
            if (abs(r - 4.0) < 0.2) {
                // DATA PACKET HIT
                // Pulse intensity based on Z position
                float intensity = sin(p.z * 0.5 + uTime * 5.0) * 0.5 + 0.5;
                
                // Cyberpunk / Matrix data stream colors (Cyan to Green)
                vec3 neon = mix(vec3(0.0, 1.0, 0.2), vec3(0.0, 0.8, 1.0), hash(floor(p.z)));
                col = neon * (1.0 + intensity * 2.0);
                
                // Extreme glassy fresnel edge highlighting on the data packets
                float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
                col += vec3(1.0) * fresnel * 2.5;
            } else {
                // EMPTY TUNNEL WALL HIT
                // Render as dark rubber/fiber material
                col = vec3(0.01, 0.02, 0.01);
            }
            
            // Fog fading into the pitch black tunnel distance
            col = mix(col, vec3(0.0), smoothstep(20.0, 50.0, dTotal));
        }
        
        col = pow(col, vec3(0.85)); // Gamma mapping
        col *= 1.0 - dot(uv, uv) * 0.5; // Heavy cinematic vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const DataFlowHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
