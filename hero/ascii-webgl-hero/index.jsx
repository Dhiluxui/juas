import React, { useEffect, useRef } from 'react';

export default function AsciiWebGLHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let A = 1, B = 1;
    let frameId: number;
    const preTag = containerRef.current?.querySelector('pre');
    
    if (!preTag) return;

    // Math extraction - Pure function execution off React Render Cycle
    const renderTorus = () => {
      const b = [];
      const z = [];
      A += 0.05;
      B += 0.03;
      const cA = Math.cos(A), sA = Math.sin(A),
            cB = Math.cos(B), sB = Math.sin(B);
            
      for(let k = 0; k < 1760; k++) {
        b[k] = k % 80 === 79 ? '\n' : ' ';
        z[k] = 0;
      }
      
      for(let j = 0; j < 6.28; j += 0.07) {
        const ct = Math.cos(j), st = Math.sin(j);
        for(let i = 0; i < 6.28; i += 0.02) {
          const sp = Math.sin(i), cp = Math.cos(i),
                h = ct + 2,
                D = 1 / (sp * h * sA + st * cA + 5),
                t = sp * h * cA - st * sA;
          
          const x = 0 | (40 + 30 * D * (cp * h * cB - t * sB)),
                y = 0 | (12 + 15 * D * (cp * h * sB + t * cB)),
                o = x + 80 * y,
                N = 0 | (8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
                
          if(y < 22 && y >= 0 && x >= 0 && x < 79 && D > z[o]) {
            z[o] = D;
            b[o] = ".,-~:;=!*#$@"[N > 0 ? N : 0];
          }
        }
      }
      preTag.innerHTML = b.join('');
      frameId = requestAnimationFrame(renderTorus);
    };
    
    renderTorus();
    
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="relative w-full min-h-[600px] bg-[#050505] overflow-hidden flex items-center justify-center font-mono p-4" ref={containerRef}>
      
      {/* Absolute positioning for the math-driven ASCII render */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-60 mix-blend-screen pointer-events-none">
        <pre 
          className="text-[#00FF41] text-[8px] sm:text-[10px] md:text-[12px] leading-none whitespace-pre font-bold"
          style={{ transform: 'scale(1.2)' }}
        ></pre>
      </div>

      {/* Grid Overlay for Premium Terminal Feel */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#00FF41 1px, transparent 1px), linear-gradient(90deg, #00FF41 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* UI Overlay - Rigid CropMarks Box Model */}
      <div className="relative z-20 text-center flex flex-col items-center p-8 md:p-12 bg-black/50 backdrop-blur-md border border-[#00FF41]/40 rounded-none shadow-[0_0_40px_rgba(0,255,65,0.1)] w-full max-w-2xl mt-12 md:mt-0">
        
        {/* Decorative Corners */}
        <div className="absolute -top-1 -left-1 size-2 bg-[#00FF41] rounded-none" />
        <div className="absolute -top-1 -right-1 size-2 bg-[#00FF41] rounded-none" />
        <div className="absolute -bottom-1 -left-1 size-2 bg-[#00FF41] rounded-none" />
        <div className="absolute -bottom-1 -right-1 size-2 bg-[#00FF41] rounded-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41] text-[10px] font-black uppercase tracking-widest mb-6">
          <div className="size-1.5 bg-[#00FF41] animate-pulse rounded-none" />
          Neural Link Active
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
          Ascii <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#00FF41] to-[#008F11]">Engine</span>
        </h1>
        
        <p className="text-[#00FF41]/80 max-w-lg mb-10 font-mono text-sm leading-relaxed text-balance">
          Harness raw computational mathematics. 
          A high-performance, frame-independent 3D Torus projection running on pure JavaScript inside React.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button className="h-12 px-8 bg-[#00FF41] text-black font-black uppercase tracking-widest text-[11px] hover:bg-[#00FF41]/90 transition-colors rounded-none flex items-center justify-center w-full sm:min-w-[200px]">
            Initialize Sequence
          </button>
          <button className="h-12 px-8 bg-transparent text-[#00FF41] border border-[#00FF41]/50 font-black uppercase tracking-widest text-[11px] hover:bg-[#00FF41]/10 transition-colors rounded-none flex items-center justify-center w-full sm:min-w-[200px]">
            View Source Code
          </button>
        </div>
      </div>
    </div>
  );
}