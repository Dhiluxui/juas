import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export default function App() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Setup Renderer
        const renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio, 2),
            alpha: false,
            antialias: true,
        });
        const gl = renderer.gl;
        containerRef.current.appendChild(gl.canvas);

        // 2. Setup Geometry
        const geometry = new Triangle(gl);

        // 3. Define Shaders
        const vertex = /* glsl */ `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragment = /* glsl */ `
            precision highp float;
            
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec2 uMouse;
            
            varying vec2 vUv;

            vec3 palette( in float t ) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.263, 0.416, 0.557);
                return a + b * cos( 6.28318 * (c * t + d) );
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
                vec2 uv0 = uv;
                
                vec2 mouseOffset = (uMouse * 2.0 - 1.0) * 0.3;
                uv += mouseOffset;
                uv0 += mouseOffset;

                vec3 finalColor = vec3(0.0);

                for (float i = 0.0; i < 4.0; i++) {
                    uv = fract(uv * 1.5) - 0.5;
                    float d = length(uv) * exp(-length(uv0));
                    vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.4);
                    
                    d = sin(d * 8.0 + uTime) / 8.0;
                    d = abs(d);
                    d = pow(0.01 / d, 1.2);
                    
                    finalColor += col * d;
                }

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        // 4. Create Program
        const program = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: [gl.canvas.width, gl.canvas.height] },
                uMouse: { value: [0.5, 0.5] },
            },
        });

        // 5. Create Mesh
        const mesh = new Mesh(gl, { geometry, program });

        // 6. Handle Interactions & Resizing
        const mouseState = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

        const updateMouse = (x, y) => {
            mouseState.targetX = x / window.innerWidth;
            mouseState.targetY = 1.0 - y / window.innerHeight;
        };

        const onMouseMove = (e) => updateMouse(e.clientX, e.clientY);
        const onTouchMove = (e) => {
            if (e.touches.length > 0) {
                updateMouse(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const resize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('resize', resize, false);
        resize();

        // 7. Render Loop
        let animationId;
        const update = (t) => {
            animationId = requestAnimationFrame(update);
            
            program.uniforms.uTime.value = t * 0.001;
            
            mouseState.x += (mouseState.targetX - mouseState.x) * 0.05;
            mouseState.y += (mouseState.targetY - mouseState.y) * 0.05;
            program.uniforms.uMouse.value = [mouseState.x, mouseState.y];
            
            renderer.render({ scene: mesh });
        };
        animationId = requestAnimationFrame(update);

        // 8. Cleanup on Unmount
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('resize', resize);
            
            if (containerRef.current && gl.canvas.parentNode === containerRef.current) {
                containerRef.current.removeChild(gl.canvas);
            }
            
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
        };
    }, []);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#050505] font-sans">
            {/* OGL Canvas Container */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* UI Overlay */}
            <div className="relative z-10 flex items-end sm:items-center justify-start p-6 sm:p-12 w-full h-full pointer-events-none">
                {/* pointer-events-auto restores interaction for the card itself, 
                  while the wrapper has pointer-events-none to let mouse events pass through to the canvas 
                */}
                <div className="pointer-events-auto p-6 rounded-2xl max-w-sm w-full transition-transform duration-500 hover:scale-[1.02] bg-[#141414]/40 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
                        <h1 className="text-white text-xl font-semibold tracking-wide">
                            React OGL Space
                        </h1>
                    </div>
                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                        An infinite fractal universe rendered in real-time using custom WebGL shaders in React.
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-3">
                            <span>Stack</span>
                            <span className="text-white bg-white/10 px-2 py-1 rounded-md">
                                React + OGL
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Interaction</span>
                            <span className="text-white bg-white/10 px-2 py-1 rounded-md">
                                Move Mouse / Touch
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}