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
  color2 = '#ff00ff',
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

    // Tunnel SDF
    float map(vec3 p) {
        // Twist the tunnel over distance
        p.xy *= rot(p.z * 0.1 + uTime * uSpeed * 0.2);
        
        // Add ripples along the tunnel walls
        float ripple = sin(p.z * 5.0 - uTime * 4.0) * 0.05;
        float ripple2 = cos(p.z * 2.0 + p.x * 4.0) * 0.1;
        
        // The tunnel is a hollow cylinder
        float d = length(p.xy) - 2.0 + ripple + ripple2;
        
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

        // Warp the screen space to create a gravitational lensing effect at the edges
        float r = length(uv);
        uv *= 1.0 + pow(r, 4.0) * 0.5;

        // Camera flies forward continuously
        vec3 ro = vec3(0.0, 0.0, uTime * uSpeed * 5.0);
        
        // Camera wobble
        ro.x += sin(uTime * 0.5) * 0.2;
        ro.y += cos(uTime * 0.4) * 0.2;
        
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Mouse look around
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        float energyRings = 0.0;
        
        for(int i = 0; i < 80; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Accumulate glowing energy rings along the tunnel walls
            // The rings pulse and travel down the tunnel
            float ringPhase = fract(p.z * 0.2 - uTime * 1.5);
            float ringThickness = smoothstep(0.95, 1.0, ringPhase);
            if(d < 0.2) {
                energyRings += 0.02 * ringThickness / (abs(d) + 0.01) * exp(-dTotal * 0.05);
            }
            
            if(d < 0.001 || dTotal > 50.0) break;
            dTotal += d * 0.8;
        }
        
        // Core center of the wormhole (infinity)
        vec3 col = vec3(1.0, 1.0, 1.0); 
        
        if (dTotal < 50.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Fake light traveling down the tunnel
            vec3 l = normalize(vec3(0.0, 0.0, 1.0));
            float diff = max(dot(n, l), 0.0);
            
            // Fresnel for glowing edges
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.0);
            
            // Wall color mapping
            vec3 wallCol = mix(uColor2, uColor1, sin(p.z * 0.1) * 0.5 + 0.5);
            col = wallCol * diff * 0.2;
            col += wallCol * fresnel * 0.8;
            
            // Add grid lines for a sci-fi wormhole look
            float gridX = smoothstep(0.9, 1.0, sin(p.x * 10.0));
            float gridY = smoothstep(0.9, 1.0, sin(p.y * 10.0));
            col += (gridX + gridY) * wallCol * 0.3 * fresnel;
        }
        
        // Add the volumetric energy rings
        col += mix(uColor1, uColor2, 0.5) * energyRings * 2.0;
        
        // Endless void fog (fades to black in the distance)
        col = mix(col, vec3(0.0, 0.0, 0.0), smoothstep(20.0, 50.0, dTotal));
        
        // But the VERY center of the screen stays intensely bright
        float centerGlow = smoothstep(0.2, 0.0, length(uv)) * smoothstep(30.0, 50.0, dTotal);
        col += vec3(1.0) * centerGlow;
        
        // Speed lines / Chromatic aberration based on depth
        col.r += smoothstep(0.1, 0.0, length(uv + vec2(0.01, 0.0))) * centerGlow;
        col.b += smoothstep(0.1, 0.0, length(uv - vec2(0.01, 0.0))) * centerGlow;

        col = pow(col, vec3(1.0 / 2.2)); // Gamma
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const QuantumWormholeGatewayHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-black overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#00ffff"
        color2="#ff00ff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.8) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
