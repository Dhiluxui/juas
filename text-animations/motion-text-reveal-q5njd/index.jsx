import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Play } from 'lucide-react';

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

const Scene = ({ children, isActive, className = "" }) => {
    return (
        <div 
            className={`absolute flex flex-col transition-opacity duration-700 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'} ${className}`}
        >
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { isActive });
                }
                return child;
            })}
        </div>
    );
};

export default function App() {
    const [activeScene, setActiveScene] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    // Configuration defining how long each scene should stay on screen (in milliseconds)
    const sceneDurations = [
        3000, // Scene 0: Brightness...
        3000, // Scene 1: Light moves...
        4500, // Scene 2: Multi-line...
        3800, // Scene 3: Highlight disappears...
        3500, // Scene 4: Clarity...
        4500, // Scene 5: Cascading
        3500  // Scene 6: Purpose
    ];

    const runSequence = async () => {
        if (isPlaying) return;
        setIsPlaying(true);
        setActiveScene(-1); // Reset first

        // Short initial delay before starting
        await new Promise(r => setTimeout(r, 500));

        for (let i = 0; i < sceneDurations.length; i++) {
            setActiveScene(i);
            // Wait for the specific scene's duration
            await new Promise(r => setTimeout(r, sceneDurations[i]));
            
            // Trigger fade out
            setActiveScene(-1);
            // Wait for CSS fade out transition (700ms) plus a tiny gap
            await new Promise(r => setTimeout(r, 800));
        }

        setIsPlaying(false);
    };

    // Auto-start on mount
    useEffect(() => {
        runSequence();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="h-screen w-full bg-[#121214] font-sans flex flex-col items-center justify-center relative overflow-hidden selection:bg-fuchsia-500/30">
            
            {/* Ambient Background Elements */}
            <div className="fixed bottom-0 left-0 right-0 h-[40vh] bg-[radial-gradient(circle_at_50%_120%,rgba(109,40,217,0.15)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />
            <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent pointer-events-none z-0 shadow-[0_-4px_30px_rgba(168,85,247,0.4)]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-500/80 to-transparent" />
            </div>

            {/* Replay Button Control */}
            <div className="fixed top-8 right-8 z-50">
                <button 
                    onClick={runSequence}
                    disabled={isPlaying}
                    className={`px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium rounded-full transition-all duration-500 flex items-center gap-2 backdrop-blur-md border border-white/10 shadow-lg ${isPlaying ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                >
                    <Play className="w-4 h-4 fill-white/20" />
                    Replay Sequence
                </button>
            </div>

            {/* Main Stage Area */}
            <div className="relative w-full max-w-5xl h-[60vh] flex items-center justify-center z-10 px-8">
                
                {/* Scene 0 */}
                <Scene isActive={activeScene === 0} className="items-center">
                    <MotionText className="text-3xl md:text-5xl" duration={1.2} hideDelay={0.6} hideDuration={1.0}>
                        Brightness defines the moment
                    </MotionText>
                </Scene>

                {/* Scene 1 */}
                <Scene isActive={activeScene === 1} className="items-center">
                    <MotionText className="text-3xl md:text-5xl" duration={1.3} hideDelay={0.7} hideDuration={1.0}>
                        Light moves before <em>words</em>
                    </MotionText>
                </Scene>

                {/* Scene 2 */}
                <Scene isActive={activeScene === 2} className="items-start gap-3 md:gap-4">
                    <MotionText className="text-2xl md:text-4xl text-gray-300" duration={1.5} hideDelay={0.5} hideDuration={1.2}>
                        Light doesn't decorate the composition.
                    </MotionText>
                    <MotionText className="text-2xl md:text-4xl" seqDelay={0.6} duration={1.6} hideDelay={0.8} hideDuration={1.2}>
                        It quietly defines <em>what matters.</em>
                    </MotionText>
                </Scene>

                {/* Scene 3 */}
                <Scene isActive={activeScene === 3} className="items-center gap-3">
                    <MotionText className="text-2xl md:text-4xl" duration={1.0} hideDelay={0.4} hideDuration={0.8}>
                        When the highlight disappears
                    </MotionText>
                    <MotionText className="text-2xl md:text-4xl" seqDelay={1.2} duration={1.4} hideDelay={0.6} hideDuration={1.0}>
                        the message <em>should</em> remain
                    </MotionText>
                </Scene>

                {/* Scene 4 */}
                <Scene isActive={activeScene === 4} className="items-center">
                    <MotionText className="text-3xl md:text-5xl" duration={1.8} hideDelay={0.15} hideDuration={1.8}>
                        Nothing competes with clarity
                    </MotionText>
                </Scene>

                {/* Scene 5 */}
                <Scene isActive={activeScene === 5} className="items-center gap-4">
                    <MotionText className="text-2xl md:text-4xl" duration={1.2} hideDelay={0.5} hideDuration={1.0}>
                        Light arrives before the <em>message</em>
                    </MotionText>
                    <MotionText className="text-2xl md:text-4xl text-gray-300" seqDelay={0.8} duration={1.4} hideDelay={0.6} hideDuration={1.2}>
                        The words simply complete the thought
                    </MotionText>
                </Scene>

                {/* Scene 6 */}
                <Scene isActive={activeScene === 6} className="items-center">
                    <MotionText className="text-3xl md:text-5xl" duration={1.5} hideDelay={0.6} hideDuration={1.2}>
                        Every highlight has <em>purpose</em>
                    </MotionText>
                </Scene>

            </div>
        </div>
    );
}