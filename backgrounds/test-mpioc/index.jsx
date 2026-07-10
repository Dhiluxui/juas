import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const App = ({
  description = "Supporting copy here",
  accentColor = "#e5484d",
  isLoading = false,
  className = ""
}) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const params = {
      speed: 0.1,
      noiseScale: 1.1,
      warpStrength: 1.2,
      colorBase: '#020412',
      colorFluid: '#0a43a8',
      colorBand1: '#ff4da6',
      colorBand2: '#d4ff00',
      colorBand3: '#00ccff',
      colorHighlight: '#ffffff',
      colorRim: accentColor,
      iridescence: 1.3
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.3, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const fragmentShader = `
      precision highp float;
      uniform float uTime, uSpeed, uNoiseScale, uWarpStrength, uIridescence;
      uniform vec3 uColorBase, uColorFluid, uColorBand1, uColorBand2, uColorBand3, uColorHighlight, uColorRim;
      varying vec3 vPosition, vNormal, vViewPosition;

      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){ 
          const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + 1.0*C.xxx; vec3 x2 = x0 - i2 + 2.0*C.xxx; vec3 x3 = x0 - 1.0+3.0*C.xxx;
          i = mod(i, 289.0); vec4 p = permute(permute(permute(i.z+vec4(0.0, i1.z, i2.z, 1.0))+i.y+vec4(0.0, i1.y, i2.y, 1.0))+i.x+vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0*floor(p*ns.z*ns.z); vec4 x_ = floor(j*ns.z); vec4 y_ = floor(j-7.0*x_);
          vec4 x = x_*ns.x + ns.yyyy; vec4 y = y_*ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0+1.0; vec4 s1 = floor(b1)*2.0+1.0; vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6-vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m*m; return 42.0*dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      const mat3 m3 = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
      float fbm(vec3 x) { float v=0.0, a=0.5; for(int i=0; i<3; ++i) { v += a*snoise(x); x=m3*x*2.0; a*=0.5; } return v; }

      void main() {
          vec3 p = vPosition * uNoiseScale; 
          vec3 q = vec3(fbm(p + vec3(0.0, uTime * uSpeed, 0.0)), fbm(p + vec3(5.2, 1.3, uTime * (uSpeed * 0.8))), fbm(p + vec3(2.4, uTime * uSpeed, 3.8)));
          vec3 r = vec3(fbm(p + uWarpStrength * q + vec3(1.7, 9.2, uTime * (uSpeed * 1.2))), fbm(p + uWarpStrength * q + vec3(8.3, 2.8, uTime * uSpeed)), fbm(p + uWarpStrength * q + vec3(3.3, 4.4, uTime * (uSpeed * 1.5))));
          float f = fbm(p + uWarpStrength * r); 
          float f_smooth = smoothstep(0.0, 1.0, f * 0.5 + 0.5);
          vec3 col = mix(uColorBase, uColorFluid, smoothstep(0.1, 0.8, f_smooth));
          float phase = f_smooth * 12.0 + r.y * 3.0 - uTime * (uSpeed * 8.0);
          vec3 waveBands = pow(sin(phase + vec3(0.0, 2.0, 4.0)) * 0.5 + 0.5, vec3(4.5));
          col += (uColorBand1 * waveBands.x + uColorBand2 * waveBands.y + uColorBand3 * waveBands.z) * smoothstep(0.2, 0.9, f_smooth) * uIridescence;
          col += uColorHighlight * smoothstep(0.9, 1.0, f_smooth) * 1.2;
          vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition);
          col += pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 3.5) * uColorRim * 0.6;
          col *= smoothstep(-0.05, 0.25, vPosition.y);
          gl_FragColor = vec4(pow(col, vec3(0.95)), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vPosition, vNormal, vViewPosition; void main() { vPosition = position; vNormal = normalize(normalMatrix * normal); vViewPosition = -(modelViewMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 }, uSpeed: { value: params.speed }, uNoiseScale: { value: params.noiseScale }, uWarpStrength: { value: params.warpStrength },
        uColorBase: { value: new THREE.Color(params.colorBase) }, uColorFluid: { value: new THREE.Color(params.colorFluid) },
        uColorBand1: { value: new THREE.Color(params.colorBand1) }, uColorBand2: { value: new THREE.Color(params.colorBand2) },
        uColorBand3: { value: new THREE.Color(params.colorBand3) }, uColorHighlight: { value: new THREE.Color(params.colorHighlight) },
        uColorRim: { value: new THREE.Color(params.colorRim) }, uIridescence: { value: params.iridescence }
      }
    });

    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 64), material);
    scene.add(sphere);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      material.uniforms.uTime.value = clock.getElapsedTime();
      sphere.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [accentColor]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
      <div className="absolute bottom-4 left-4 text-white font-sans text-sm">
        {description}
      </div>
    </div>
  );
};

export default App;