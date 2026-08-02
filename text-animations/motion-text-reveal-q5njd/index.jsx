import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

const animateValue = (duration, easing, callback) => {
    return new Promise(resolve => {
        const startTime = performance.now();
        
        function tick(currentTime) {
            const elapsed = currentTime - startTime;
            let progress = elapsed / (duration * 1000);
            
            if (progress >= 1) {
                callback(easing(1));
                resolve();
                return;
            }
            
            callback(easing(progress));
            requestAnimationFrame(tick);
        }
        
        requestAnimationFrame(tick);
    });
};

const easeOutQuart = x => 1 - Math.pow(1 - x, 4);
const easeInOutQuad = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

const MotionText = ({ 
    children, 
    isActive, 
    duration = 1.5, 
    hideDelay = 0.5, 
    hideDuration = 1.0, 
    seqDelay = 0,
    className = "" 
}) => {
    const wrapperRef = useRef(null);
    const textLayerRef = useRef(null);
    const [highlights, setHighlights] = useState([]);

    // Measure the exact position and width of any <em> tags inside the text
    useLayoutEffect(() => {
        if (!textLayerRef.current) return;

        const measure = () => {
            const ems = textLayerRef.current.querySelectorAll('em');
            const data = Array.from(ems).map(em => ({
                left: em.offsetLeft,
                width: em.offsetWidth
            }));
            setHighlights(data);
        };

        measure();
        
        // Re-measure when fonts load to ensure absolute precision
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(measure);
        }

        // Re-measure on window resize to maintain responsiveness
        const observer = new ResizeObserver(measure);
        observer.observe(textLayerRef.current);

        return () => observer.disconnect();
    }, [children]);

    useEffect(() => {
        let isMounted = true;
        let timeouts = [];

        if (isActive) {
            // Initial Reset
            if (wrapperRef.current) {
                wrapperRef.current.style.setProperty('--right-edge', '0%');
                wrapperRef.current.style.setProperty('--left-edge', '0%');
                wrapperRef.current.style.setProperty('--cursor-opacity', '1');
            }

            // 1. Start reveal sweep
            const t1 = setTimeout(() => {
                if (!isMounted) return;
                animateValue(duration, easeOutQuart, (v) => {
                    if (wrapperRef.current) {
                        wrapperRef.current.style.setProperty('--right-edge', `${v * 100}%`);
                    }
                });
            }, seqDelay * 1000);
            timeouts.push(t1);

            // 2. Start hiding the sweep background (if not persistent)
            if (hideDelay < 99) {
                const t2 = setTimeout(() => {
                    if (!isMounted) return;
                    animateValue(hideDuration, easeInOutQuad, (v) => {
                         if (wrapperRef.current) {
                             wrapperRef.current.style.setProperty('--left-edge', `${v * 100}%`);
                         }
                    });
                }, (seqDelay + hideDelay) * 1000);
                timeouts.push(t2);
            }

            // 3. Fade out the leading cursor line
            const t3 = setTimeout(() => {
                if (!isMounted) return;
                if (wrapperRef.current) {
                    wrapperRef.current.style.setProperty('--cursor-opacity', '0');
                }
            }, (seqDelay + duration) * 1000 + 100);
            timeouts.push(t3);

        } else {
             // Hard reset when inactive
             if (wrapperRef.current) {
                 wrapperRef.current.style.setProperty('--right-edge', '0%');
                 wrapperRef.current.style.setProperty('--left-edge', '0%');
                 wrapperRef.current.style.setProperty('--cursor-opacity', '0');
             }
        }

        return () => {
            isMounted = false;
            timeouts.forEach(clearTimeout);
        };
    }, [isActive, duration, hideDelay, hideDuration, seqDelay]);

    return (
        <div 
            ref={wrapperRef} 
            className={`relative inline-flex items-center whitespace-nowrap font-medium tracking-tight ${className}`}
        >
            {/* Layer A: Persistent Highlight Blocks (Behind text) */}
            <div 
                className="absolute inset-0 z-10" 
                style={{ clipPath: 'inset(0 calc(100% - var(--right-edge, 0%)) 0 0)' }}
            >
                {highlights.map((h, i) => (
                    <div 
                        key={i} 
                        className="absolute bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-sm"
                        style={{ 
                            top: '-0.1em', 
                            bottom: '-0.1em', 
                            left: `${h.left - 4}px`, 
                            width: `${h.width + 8}px` 
                        }} 
                    />
                ))}
            </div>

            {/* Layer B: Moving Sweep Highlight */}
            <div 
                className="absolute z-[5] bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-sm"
                style={{ 
                    top: '-0.1em', 
                    bottom: '-0.1em', 
                    left: '-0.2em', 
                    right: '-0.2em', 
                    clipPath: 'inset(0 calc(100% - var(--right-edge, 0%)) 0 var(--left-edge, 0%))' 
                }} 
            />

            {/* Layer C: The Text Content */}
            <div 
                ref={textLayerRef} 
                className="relative z-20 text-white [&>em]:not-italic"
                style={{ clipPath: 'inset(0 calc(100% - var(--right-edge, 0%)) 0 0)' }}
            >
                {children}
            </div>

            {/* Layer D: Leading Cursor Line */}
            <div 
                className="absolute z-30 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_4px_rgba(217,70,239,0.5)]"
                style={{ 
                    top: '-0.15em', 
                    bottom: '-0.15em', 
                    left: 'var(--right-edge, 0%)', 
                    transform: 'translateX(-50%)', 
                    opacity: 'var(--cursor-opacity, 0)', 
                    transition: 'opacity 0.3s ease' 
                }} 
            />
        </div>
    );
};

export default function App() {
    const [isActive, setIsActive] = useState(false);

    // Auto-start animations and loop continuously
    useEffect(() => {
        const initialTimer = setTimeout(() => setIsActive(true), 300);
        
        const loopInterval = setInterval(() => {
            setIsActive(false);
            // Brief pause before restarting
            setTimeout(() => setIsActive(true), 100);
        }, 4000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(loopInterval);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#121214] font-sans flex flex-col items-center justify-center relative overflow-hidden selection:bg-fuchsia-500/30 p-8">
            <MotionText 
                isActive={isActive} 
                className="text-3xl md:text-5xl" 
                duration={1.2} 
                hideDelay={0.6} 
                hideDuration={1.0}
            >
                Brightness defines the moment
            </MotionText>
        </div>
    );
}