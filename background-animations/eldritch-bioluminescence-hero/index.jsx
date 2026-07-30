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
  color1 = '#00ffaa',
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

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Eldritch Flora Tentacle Map
    float map(vec3 p) {
        // Bend the entire space over time to create undulating motion
        p.xz *= rot(sin(p.y * 0.5 + uTime * uSpeed) * 0.3);
        p.xy *= rot(cos(p.z * 0.4 + uTime * uSpeed * 0.8) * 0.2);
        
        // Circular repetition (like petals or tentacles around a core)
        float a = atan(p.x, p.z);
        float r = length(p.xz);
        float numTentacles = 8.0;
        
        // Create an angular folding
        float polar = mod(a + p.y * 0.2, 6.28318 / numTentacles) - (3.14159 / numTentacles);
        vec2 q = vec2(sin(polar) * r, cos(polar) * r);
        
        // Push the tentacles outward from the center
        q.y -= 1.5 + sin(p.y * 2.0 + uTime * 2.0) * 0.2;
        
        // Taper the tentacles towards the top
        float thickness = 0.2 * smoothstep(8.0, 0.0, p.y + 4.0);
        
        // Base tentacle cylinder SDF
        float d = length(q) - thickness;
        
        // Add ribbed/bulbous details using a sine wave along the Y axis
        d += sin(p.y * 15.0 - uTime * 4.0) * 0.03 * smoothstep(0.0, 0.1, thickness);
        
        // Add a central glowing stalk/core
        float core = length(p.xz) - 0.5 + sin(p.y * 3.0 - uTime * 3.0) * 0.1;
        
        return min(d, core);
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

        // Abyssal camera setup
        vec3 ro = vec3(0.0, 2.0, -8.0);
        vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
        
        // Mouse interact
        float pan = (m.x - 0.5) * 3.0;
        float tilt = (m.y - 0.5) * 2.0 + 0.5; // Look down slightly
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan + uTime * 0.1);
        rd.xz *= rot(pan + uTime * 0.1);
        
        float dTotal = 0.0;
        float glow = 0.0;
        vec3 p;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Subsurface / Bioluminescent glow accumulation
            if(d < 0.15) {
                // The tentacles pulse with energy
                float pulse = sin(p.y * 2.0 - uTime * 3.0) * 0.5 + 0.5;
                glow += 0.005 * pulse / (abs(d) + 0.005) * exp(-dTotal * 0.1);
            }
            
            if(d < 0.002 || dTotal > 30.0) break;
            dTotal += d * 0.7; // Smaller step size for twisted space
        }
        
        // Abyssal dark background
        vec3 col = vec3(0.0, 0.02, 0.04) * (1.0 - length(uv) * 0.5);
        
        if (dTotal < 30.0) {
            vec3 n = getNormal(p);
            vec3 l = normalize(vec3(0.0, 5.0, 0.0)); // Fake light from above
            
            float diff = max(dot(n, l), 0.0);
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
            
            // Subsurface scattering approximation for squishy flora
            float sss = smoothstep(0.0, 1.0, map(p + l * 0.5)) * 0.5;
            
            // Organic slimy material
            vec3 baseCol = mix(vec3(0.0, 0.1, 0.2), uColor2, p.y * 0.1);
            
            col = baseCol * diff * 0.5;
            col += uColor1 * sss; // Internal light bleed
            col += uColor1 * fresnel * 1.5; // Slimy edge reflection
        }
        
        // Add the intense bioluminescent glow
        col += mix(uColor2, uColor1, sin(uTime)*0.5+0.5) * glow;
        
        // Deep sea murk/fog
        float fog = smoothstep(5.0, 30.0, dTotal);
        col = mix(col, vec3(0.0, 0.01, 0.03), fog);
        
        // Tiny floating marine snow / particles
        float snow = fract(sin(dot(floor(uv * 150.0 + uTime), vec2(12.9898, 78.233))) * 43758.5453);
        if (snow > 0.995) {
            col += uColor1 * (sin(uTime * 10.0 + uv.x * 100.0) * 0.5 + 0.5) * (1.0 - fog);
        }

        // Color grading
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const EldritchBioluminescenceHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#000408] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={0.8}
        color1="#00ffaa"
        color2="#0055ff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(0, 4, 8, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
