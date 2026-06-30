import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const NeonFluidText = ({
  text = 'VERZIOT',
  fontFamily = '"Outfit", system-ui, sans-serif',
  speed = 1.0,
  smearIntensity = 0.015,
  className = ''
}) => {
  const containerRef = useRef(null);
  const propsRef = useRef({ text, fontFamily, speed, smearIntensity });
  const textureUpdateRef = useRef(null);

  useEffect(() => {
    propsRef.current = { text, fontFamily, speed, smearIntensity };
    if (textureUpdateRef.current) textureUpdateRef.current();
  }, [text, fontFamily, speed, smearIntensity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Initialize Safe WebGL Renderer
    // Clears out any ghost canvases from React Strict Mode
    if (container.children.length > 0) {
      container.innerHTML = ''; 
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none'
    });
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    // 2. Fixed Safe-Size Texture Canvas (Prevents all Resize/Memory Crashes)
    const TEX_WIDTH = 1024;
    const TEX_HEIGHT = 512;
    const textCanvas = document.createElement('canvas');
    textCanvas.width = TEX_WIDTH;
    textCanvas.height = TEX_HEIGHT;
    
    const ctx = textCanvas.getContext('2d', { willReadFrequently: true });
    
    const texture = new THREE.CanvasTexture(textCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Essential for WebGL 1.0 stability
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // 3. The "Radial Stamp" Manual Blur Method
    // 100% GPU safe. No ctx.filter, no ctx.shadowBlur, no strokeText.
    const updateTextTexture = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

      const { text: currentText, fontFamily: currentFont } = propsRef.current;
      
      // Calculate font size to fit safely inside the 1024x512 bounds
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 160px ${currentFont}, sans-serif`;

      const cx = TEX_WIDTH / 2;
      const cy = TEX_HEIGHT / 2;

      // Draw the text repeatedly in a circle to mimic a perfect blur
      const drawRadialBlur = (radius, opacity, steps) => {
        // Divide opacity by the number of stamps so it doesn't blow out to pure white
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity / steps})`;
        for (let i = 0; i < steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const x = Math.cos(theta) * radius;
          const y = Math.sin(theta) * radius;
          ctx.fillText(currentText, cx + x, cy + y);
        }
      };

      // Create the Distance Field layers manually
      drawRadialBlur(30, 0.4, 24); // Wide soft glow (24 stamps)
      drawRadialBlur(15, 0.6, 16); // Mid spread (16 stamps)
      drawRadialBlur(6, 0.8, 8);   // Inner bright rim (8 stamps)

      // Solid, perfectly sharp core exactly in the center
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(currentText, cx, cy);

      texture.needsUpdate = true;
    };
    
    textureUpdateRef.current = updateTextTexture;

    // 4. Shader Program
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uText;
      uniform float uTime;
      uniform float uSmear;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // Dynamic fluid wobble
        float n1 = sin(uv.x * 8.0 + uTime) * cos(uv.x * 5.0 - uTime * 0.8);
        float n2 = cos(uv.y * 6.0 + uTime * 1.2) * sin(uv.y * 4.0 - uTime);
        vec2 warpUv = uv + vec2(n2 * 0.01, n1 * 0.02);
        
        // Smear flames
        float smearDir = sin(uv.x * 6.0 + uTime * 0.5) * cos(uv.x * 3.0 - uTime * 0.3);
        vec2 dir = vec2(0.0, smearDir * uSmear);
        
        float dR = 0.0, dG = 0.0, dB = 0.0;
        
        for(int i = 0; i < 12; i++) {
            float fi = float(i);
            vec2 samplePos = warpUv + dir * fi;
            dR += texture2D(uText, samplePos).r;
            dG += texture2D(uText, samplePos + dir * 0.4).r; 
            dB += texture2D(uText, samplePos + dir * 0.8).r;
        }
        dR /= 12.0; dG /= 12.0; dB /= 12.0;
        
        // Neon rings extraction
        float neonR = smoothstep(0.0, 0.45, dR) - smoothstep(0.45, 0.55, dR);
        float neonG = smoothstep(0.0, 0.45, dG) - smoothstep(0.45, 0.55, dG);
        float neonB = smoothstep(0.0, 0.45, dB) - smoothstep(0.45, 0.55, dB);
        
        vec3 ring = vec3(neonR, neonG, neonB);
        
        // Color mapping
        vec3 color = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 0.0, 0.0), smoothstep(0.1, 0.3, uv.x));
        color = mix(color, vec3(1.0, 0.0, 1.0), smoothstep(0.3, 0.5, uv.x));                  
        color = mix(color, vec3(0.0, 0.0, 1.0), smoothstep(0.5, 0.7, uv.x));                  
        color = mix(color, vec3(0.0, 1.0, 1.0), smoothstep(0.7, 0.9, uv.x));                  
        
        vec3 finalColor = color * ring * 2.5;
        
        // Background ambient glow
        float baseGlow = smoothstep(0.0, 0.8, dG) * 0.15;
        finalColor += color * baseGlow;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uText: { value: texture },
        uSmear: { value: propsRef.current.smearIntensity }
      },
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Container Resize Logic
    // Notice this ONLY resizes the renderer, NOT the texture. 
    // This entirely eliminates the blank-screen race condition.
    const resize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;

      renderer.setSize(w, h);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // 6. Safe Font Loading & Heartbeat
    updateTextTexture();
    document.fonts.ready.then(updateTextTexture);

    let refreshCount = 0;
    const fontRefreshInterval = setInterval(() => {
      updateTextTexture();
      refreshCount++;
      if (refreshCount > 5) clearInterval(fontRefreshInterval);
    }, 500);

    // 7. Render Loop
    let raf;
    const t0 = performance.now();
    const render = (t) => {
      material.uniforms.uTime.value = ((t - t0) * 0.001) * propsRef.current.speed;
      material.uniforms.uSmear.value = propsRef.current.smearIntensity;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // 8. Cleanup
    return () => {
      clearInterval(fontRefreshInterval);
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []); 

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full min-h-[800px] overflow-hidden bg-black ${className}`}
      style={{ isolation: 'isolate' }}
    />
  );
};

export default function App() {
  const [text] = useState('VERZIOT');
  const [speed] = useState(1.0);
  const [smear] = useState(0.015);

  return (
    <>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap');`}
      </style>
      <div className="relative w-screen h-screen bg-black overflow-hidden font-sans" style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>
        <NeonFluidText
          text={text}
          speed={speed}
          smearIntensity={smear}
          className="absolute inset-0 z-0 h-screen min-h-0"
        />
      </div>
    </>
  );
}