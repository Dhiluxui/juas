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
  color1 = '#00bbff',
  color2 = '#ff0088',
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

    float hash(vec3 p) {
        p = fract(p * vec3(234.34, 435.12, 123.98));
        p += dot(p, p + 54.32);
        return fract(p.x * p.y * p.z);
    }

    // A gyroid-like structure modified to look like connected synapses
    float map(vec3 p) {
        // Slow structural shift
        p.xy *= rot(sin(uTime * 0.1) * 0.5);
        
        // Add tiny oscillations for organic movement
        p += sin(p.yzx * 3.0 + uTime * uSpeed) * 0.05;
        
        // Complex trigonometric network (Gyroid variant)
        float scale = 1.5;
        vec3 p2 = p * scale;
        float d = abs(dot(sin(p2), cos(p2.zxy)) - 0.2) / scale - 0.05;
        
        // Create thicker "nodes" at the intersections
        float nodes = length(fract(p * 0.5) - 0.5) - 0.1;
        
        // Smoothly blend the thin connections into the thick nodes
        float k = 0.3;
        float h = clamp(0.5 + 0.5 * (d - nodes) / k, 0.0, 1.0);
        return mix(d, nodes, h) - k * h * (1.0 - h);
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

        // Camera flies slowly through the neural net
        vec3 ro = vec3(uTime * uSpeed * 0.2, 0.0, uTime * uSpeed * 0.5);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Interactive looking
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        float synapseGlow = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Collect volumetric light inside the network
            if(d < 0.2) {
                // Firing action potentials (bright flashes traveling along the structure)
                float pulse = smoothstep(0.9, 1.0, sin(p.x * 5.0 + p.y * 3.0 + p.z * 4.0 - uTime * 10.0));
                
                // Add ambient structural glow + the bright pulses
                synapseGlow += (0.01 + pulse * 0.05) / (abs(d) + 0.02) * exp(-dTotal * 0.15);
            }
            
            if(d < 0.001 || dTotal > 15.0) break;
            dTotal += d * 0.7; // Lower step multiplier for complex geometry
        }
        
        // Deep brain fluid background
        vec3 col = vec3(0.005, 0.0, 0.01);
        
        if (dTotal < 15.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Fresnel lighting for the slimy/wet neural look
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            
            // Base material color (dark purple/blue)
            vec3 materialCol = mix(vec3(0.02, 0.0, 0.05), vec3(0.0, 0.05, 0.1), sin(p.y * 2.0)*0.5+0.5);
            
            col = materialCol + uColor1 * fresnel * 0.5;
            
            // Add surface-level pulsing lights
            float pulse = smoothstep(0.95, 1.0, sin(p.x * 5.0 + p.y * 3.0 + p.z * 4.0 - uTime * 10.0));
            col += mix(uColor1, uColor2, sin(p.x * 2.0)*0.5+0.5) * pulse * 2.0;
        }
        
        // Add volumetric glow
        vec3 glowColor = mix(uColor1, uColor2, sin(uTime * 0.5)*0.5+0.5);
        col += glowColor * synapseGlow;
        
        // Microscopic Depth of Field blur (fakes it by washing out distant geometry)
        col = mix(col, vec3(0.005, 0.0, 0.01), smoothstep(5.0, 15.0, dTotal));
        
        // Vignette
        col *= 1.2 - dot(uv, uv) * 0.8;
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const SynapticNeuralNetworkHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#010002] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#00bbff"
        color2="#ff0088"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(1, 0, 2, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
