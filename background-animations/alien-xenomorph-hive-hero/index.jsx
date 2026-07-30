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
  color1 = '#ff1100', // Glowing Egg/Heart Red
  color2 = '#002211', // Biomechanical Slime Green/Black
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
    uniform vec3 uColor1; // Egg Glow (Red)
    uniform vec3 uColor2; // Hive Slime (Dark Green)

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // 3D Voronoi / Cellular noise for the Hive walls
    vec3 hash3( vec3 p ) {
        p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                  dot(p,vec3(269.5,183.3,246.1)),
                  dot(p,vec3(113.5,271.9,124.6)));
        return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }

    // Returns distance to closest cell center, and the center id
    vec2 voronoi( in vec3 x ) {
        vec3 p = floor( x );
        vec3 f = fract( x );
        
        float id = 0.0;
        float res = 100.0;
        
        for( int k=-1; k<=1; k++ )
        for( int j=-1; j<=1; j++ )
        for( int i=-1; i<=1; i++ ) {
            vec3 b = vec3( float(i), float(j), float(k) );
            vec3 r = vec3( b ) - f + hash3( p + b ) * 0.5; // Jitter
            
            // Heartbeat animation for the cell centers
            float d = dot( r, r );
            
            if( d < res ) {
                id = dot(p+b, vec3(1.0, 57.0, 113.0)); // Unique ID for this cell
                res = d;
            }
        }
        return vec2( sqrt( res ), id );
    }
    
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // Map the Hive
    float map(vec3 p) {
        // Base tunnel
        float tunnel = length(p.xy) - 3.0;
        
        // Add Voronoi cells to the walls
        vec2 v = voronoi(p * 1.5);
        float cellDist = v.x;
        
        // Invert the cells to make them pockets/eggs on the walls
        // Smooth min them into the tunnel to look fleshy and connected
        float hiveWall = tunnel - (1.0 - cellDist) * 1.5;
        
        // Add dripping slime (sine waves stretching downwards)
        float slime = sin(p.x * 10.0) * sin(p.z * 10.0) * 0.1;
        // Gravity pulls slime down on Y
        float drips = sin(p.x * 5.0 + uTime) * sin(p.z * 5.0) * exp(-p.y * 0.5) * 0.1;
        
        hiveWall += slime + drips;
        
        return hiveWall * 0.5; // Smooth stepping
    }

    // Secondary map to isolate the glowing eggs inside the cells
    float mapEggs(vec3 p) {
        vec2 v = voronoi(p * 1.5);
        // The egg is at the center of the cell (where v.x is 0)
        // Make it a pulsating sphere
        float heartbeat = sin(uTime * uSpeed * 4.0 + v.y) * 0.5 + 0.5;
        heartbeat = pow(heartbeat, 4.0); // Sharp pulse
        
        float eggSize = 0.2 + heartbeat * 0.1;
        float egg = v.x - eggSize;
        
        return egg;
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

        // Walking through the hive tunnel
        vec3 ro = vec3(0.0, -1.0, uTime * uSpeed * 1.5);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Look around
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        
        // Camera bobbing like footsteps
        ro.y += sin(uTime * uSpeed * 3.0) * 0.1;
        ro.x += cos(uTime * uSpeed * 1.5) * 0.1;
        
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float eggGlow = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Check distance to eggs for glowing
            float dEgg = mapEggs(p);
            if (dEgg < 0.5) {
                // Accumulate red glow from the eggs
                vec2 v = voronoi(p * 1.5);
                float heartbeat = sin(uTime * uSpeed * 4.0 + v.y) * 0.5 + 0.5;
                eggGlow += (0.01 + heartbeat * 0.02) / (abs(dEgg) + 0.02) * exp(-dTotal * 0.1);
            }
            
            if(d < 0.01 || dTotal > 20.0) break;
            dTotal += d; 
        }
        
        vec3 col = vec3(0.0);
        
        if (dTotal < 20.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Flashlight attached to camera
            vec3 l = normalize(ro - p);
            float diff = max(dot(n, l), 0.0);
            
            // Specular for wet slime
            float spec = pow(max(dot(reflect(-l, n), v), 0.0), 32.0);
            
            // Base flesh/biomechanical wall color
            vec3 wallCol = uColor2; // Dark greenish black
            
            // Add some fleshy tones in the crevices
            float crevice = smoothstep(0.0, 1.0, map(p + n * 0.5));
            wallCol = mix(vec3(0.1, 0.0, 0.0), wallCol, crevice);
            
            col = wallCol * diff * 2.0; // Flashlight illumination
            col += vec3(0.8, 1.0, 0.8) * spec * 2.0; // Wet slime highlights
            
            // Fresnel rim lighting from ambient slime glow
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
            col += uColor2 * fresnel * 0.5;
        }
        
        // Add the pulsating egg subsurface glow
        col += uColor1 * eggGlow * 1.5;
        
        // Distance fog (pitch black darkness)
        col = mix(col, vec3(0.0), smoothstep(10.0, 20.0, dTotal));
        
        // High contrast cinematic color grading
        col = pow(col, vec3(1.0 / 2.2));
        col *= 1.2 - dot(uv, uv) * 1.2; // Heavy flashlight vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const AlienXenomorphHiveHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#000000] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ff1100"
        color2="#002211"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(0, 0, 0, 0.98) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
