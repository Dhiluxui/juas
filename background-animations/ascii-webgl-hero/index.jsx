import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ShieldAlert, Cpu } from 'lucide-react';


interface AsciiShaderProps {
  imageSrc: string;
  className?: string;
  charSize?: number;
}

export function AsciiShader({ imageSrc, className = '', charSize = 12 }: AsciiShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'anonymous';

    let animationFrameId: number;

    img.onload = () => {
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      const density = '    .:/=+*2e#%';
      let lastTime = 0;
      
      const render = (time: number) => {
        if (time - lastTime < 41) { // Throttle frame rate slightly for classic feel
          animationFrameId = requestAnimationFrame(render);
          return;
        }
        lastTime = time;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        if (width === 0 || height === 0) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const cols = Math.floor(width / charSize);
        const rows = Math.floor(height / charSize);

        if (cols === 0 || rows === 0) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        offscreen.width = cols;
        offscreen.height = rows;

        offCtx.drawImage(img, 0, 0, cols, rows);
        const imgData = offCtx.getImageData(0, 0, cols, rows);
        const pixels = imgData.data;

        ctx.clearRect(0, 0, width, height);
        
        ctx.font = `bold ${charSize}px monospace`;
        ctx.textBaseline = 'top';

        const t = time * 0.002;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            
            if (brightness > 40) {
              const noise = Math.sin(x * 0.2 + t) * Math.cos(y * 0.2 + t) * 50;
              const animatedBrightness = Math.max(0, Math.min(255, brightness + noise));
              
              const charIndex = Math.floor((animatedBrightness / 255) * (density.length - 1));
              const char = density[charIndex];

              if (char !== ' ') {
                ctx.fillStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${animatedBrightness / 255})`;
                ctx.fillText(char, x * charSize, y * charSize);
              }
            }
          }
        }
        
        animationFrameId = requestAnimationFrame(render);
      };
      
      animationFrameId = requestAnimationFrame(render);
    };

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [imageSrc, charSize]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full block pointer-events-none select-none ${className}`} 
    />
  );
}


const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y; // flip y for textures
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_imageResolution;
  uniform sampler2D u_chars;
  uniform sampler2D u_image;
  uniform int u_imageLoaded;

  // Simplex 2D noise for organic flickering
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // 1. Calculate Object-Cover UV mapping for the background image
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.y = 1.0 - st.y; // flip coordinates for sampling
    
    vec2 imgUv = st;
    if (u_imageLoaded == 1) {
      float screenAspect = u_resolution.x / u_resolution.y;
      float imgAspect = u_imageResolution.x / u_imageResolution.y;
      
      if (screenAspect > imgAspect) {
        float scale = imgAspect / screenAspect;
        imgUv.y = (st.y - 0.5) * scale + 0.5;
      } else {
        float scale = screenAspect / imgAspect;
        imgUv.x = (st.x - 0.5) * scale + 0.5;
      }
    }
    
    vec4 imgColor = vec4(0.0, 0.0, 0.0, 1.0);
    if (u_imageLoaded == 1) {
      if (imgUv.x >= 0.0 && imgUv.x <= 1.0 && imgUv.y >= 0.0 && imgUv.y <= 1.0) {
        imgColor = texture2D(u_image, imgUv);
      }
    }

    float luma = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));

    // 2. Procedural Blob (The Revealer / Spotlight)
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float rightSideOffset = (u_resolution.x / min(u_resolution.x, u_resolution.y)) * 0.25;
    vec2 center = vec2(rightSideOffset, 0.0);
    
    center.x += snoise(vec2(u_time * 0.1, 0.0)) * 0.15;
    center.y += snoise(vec2(0.0, u_time * 0.15)) * 0.5;
    
    float dist = length(p - center);
    float blobNoise = snoise(p * 2.5 - u_time * 0.2) * 0.2;
    blobNoise += snoise(p * 5.0 + u_time * 0.4) * 0.05;
    dist += blobNoise;

    float blob = smoothstep(0.9, 0.0, dist);
    float core = smoothstep(0.4, 0.0, dist);
    float spotlight = clamp(blob + core, 0.0, 1.0);

    // 3. Background combination
    vec3 unBlobColor = vec3(luma) * vec3(0.3, 0.5, 0.9) * 0.4;
    vec3 revealedColor = imgColor.rgb * 1.2;
    vec3 finalBg = mix(unBlobColor, revealedColor, spotlight);

    // 4. ASCII Grid calculation
    float grid = 70.0; // resolution of ASCII grid (increased slightly for fidelity)
    vec2 st_aspect = st;
    st_aspect.x *= u_resolution.x / u_resolution.y; // Fix aspect ratio stretching
    vec2 cell = floor(st_aspect * grid);
    vec2 cellUv = fract(st_aspect * grid);

    float n = snoise(cell * 0.1 + u_time * 0.05);
    float charIndex = floor(mod((n * 20.0) + (u_time * 2.0), 6.0));
    
    vec2 texUv = vec2((cellUv.x + charIndex) / 6.0, cellUv.y);
    float charAlpha = texture2D(u_chars, texUv).r;

    // 5. Coloring the ASCII
    float imgIntensity = smoothstep(0.05, 0.5, luma);
    float charMask = imgIntensity * (1.0 - spotlight * 0.9);
    
    float flicker = snoise(st * 3.0 + u_time * 0.5) * 0.2;
    charMask = clamp(charMask + flicker, 0.0, 1.0);

    vec3 blue1 = vec3(0.05, 0.1, 0.3);
    vec3 blue4 = vec3(0.14, 0.39, 1.0); 
    vec3 charColor = mix(blue1, blue4, charMask * 1.5);

    vec3 finalColor = mix(finalBg, charColor, charAlpha * smoothstep(0.05, 0.4, charMask));
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;


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

export function WebGLAscii({ imageSrc = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop' }: { imageSrc?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // 1. Generate ASCII sprite map
    const chars = ['2', 'e', '+', '=', '*', '/'];
    const charSize = 64;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = charSize * chars.length;
    spriteCanvas.height = charSize;
    const ctx = spriteCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${charSize * 0.8}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      chars.forEach((char, i) => {
        ctx.fillText(char, i * charSize + charSize / 2, charSize / 2 + 4);
      });
    }

    // 2. Setup WebGL Program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 3. Geometry (Full screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 4. Uniform Locations
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const imgResolutionLocation = gl.getUniformLocation(program, 'u_imageResolution');
    const charsLocation = gl.getUniformLocation(program, 'u_chars');
    const imageLocation = gl.getUniformLocation(program, 'u_image');
    const imageLoadedLocation = gl.getUniformLocation(program, 'u_imageLoaded');

    // 5. Upload Sprite Texture (Texture Unit 0)
    const spriteTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spriteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(charsLocation, 0);

    // 6. Setup Background Image Texture (Texture Unit 1)
    const bgTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.uniform1i(imageLocation, 1);
    gl.uniform1i(imageLoadedLocation, 0);

    let imgWidth = 1;
    let imgHeight = 1;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      imgWidth = img.width;
      imgHeight = img.height;
      gl.uniform2f(imgResolutionLocation, imgWidth, imgHeight);
      gl.uniform1i(imageLoadedLocation, 1);
    };

    // 7. Render Loop
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

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(timeLocation, (time - startTime) * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteTexture(spriteTexture);
      gl.deleteTexture(bgTexture);
      gl.deleteBuffer(positionBuffer);
    };
  }, [imageSrc]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}


export const AsciiShaderHero = ({ 
  children, 
  imageSrc = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" 
}: { 
  children?: React.ReactNode, 
  imageSrc?: string 
}) => {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans">
      
      {/* Background WebGL ASCII Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <WebGLAscii imageSrc={imageSrc} />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full flex items-center justify-start px-8 md:px-16 lg:px-32">
        {children}
      </div>
      
    </div>
  );
};


export default function App() {
  return (
    <div className="w-screen h-screen m-0 p-0 overflow-hidden bg-black text-white">
      <AsciiShaderHero imageSrc="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop">
        {/* The overlay card has been removed */}
      </AsciiShaderHero>
    </div>
  );
}