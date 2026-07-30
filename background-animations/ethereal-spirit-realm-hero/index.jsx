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
  color1 = '#77aaff', // Spirit Blue
  color2 = '#ff00aa', // Mystic Pink
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
    uniform vec3 uColor1; // Spirit Blue
    uniform vec3 uColor2; // Mystic Pink

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // 3D Noise for Volumetric Mist
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
        f += 0.5000*noise(p); p = p*2.01;
        f += 0.2500*noise(p); p = p*2.02;
        f += 0.1250*noise(p); p = p*2.03;
        f += 0.0625*noise(p);
        return f;
    }

    // Map function returns density of the mist
    float mapDensity(vec3 p) {
        // Create swirling clouds
        vec3 q = p;
        q.xz *= rot(uTime * 0.1); // Slow swirl
        
        // Base cloud layer
        float d = fbm(q * 0.5 + uTime * uSpeed * 0.2);
        
        // Add turbulent wisps
        d += fbm(q * 2.0 - vec3(0.0, uTime * uSpeed * 0.5, 0.0)) * 0.5;
        
        // Subtract a core tunnel to fly through
        float tunnel = length(p.xy) - 2.0;
        d -= smoothstep(0.0, 2.0, -tunnel); // Carve out center
        
        return clamp(d * 0.5, 0.0, 1.0);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        vec3 ro = vec3(0.0, 0.0, uTime * uSpeed * 2.0); // Flying forward
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        // Volumetric Raymarching
        float dTotal = 0.0;
        vec3 col = vec3(0.0);
        float transmittance = 1.0;
        
        // Step size for volumetrics
        float stepSize = 0.2;
        
        for(int i = 0; i < 50; i++) {
            vec3 p = ro + rd * dTotal;
            
            // Get mist density at this point
            float density = mapDensity(p);
            
            if (density > 0.01) {
                // Calculate lighting/color for this mist volume
                
                // Color variation based on position and time
                vec3 mistCol = mix(uColor1, uColor2, fbm(p * 0.2 + uTime * 0.1));
                
                // Add "Spirit Lights" - bright glowing points flying around
                float spirits = 0.0;
                for (float j = 0.0; j < 3.0; j++) {
                    // Spirit position (orbiting around Z axis)
                    float st = uTime * uSpeed * (1.0 + j*0.2);
                    vec3 sp = vec3(sin(st + j) * 2.0, cos(st*1.3 + j) * 2.0, ro.z + 5.0 + sin(st*0.7)*3.0);
                    
                    float distToSpirit = length(p - sp);
                    spirits += 0.1 / (distToSpirit * distToSpirit + 0.1);
                }
                
                // Base mist color + spirit illumination
                vec3 stepCol = mistCol * density * 2.0 + uColor1 * spirits * density;
                
                // Accumulate color and decrease transmittance (fog thickness)
                col += stepCol * transmittance * stepSize;
                transmittance *= exp(-density * stepSize * 2.0);
                
                // Early exit if completely opaque
                if (transmittance < 0.01) break;
            }
            
            dTotal += stepSize;
        }
        
        // Add some glowing spirit particles directly to the lens (dust)
        float dust = fbm(vec3(uv * 10.0, uTime));
        if (dust > 0.7) {
            col += uColor1 * (dust - 0.7) * transmittance;
        }
        
        // Post processing
        col = pow(col, vec3(1.0 / 2.2));
        col *= 1.2 - dot(uv, uv) * 0.8; // Vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const EtherealSpiritRealmHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#02050a] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#77aaff"
        color2="#ff00aa"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(2, 5, 10, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
