import React, { useEffect, useRef, useState } from 'react';
import './AntigravityBackground.css';

// We inline the worklet code to avoid file path/MIME type issues
const WORKLET_CODE = `
function t(t){return function(){t=1831565813+(t|=0)|0;var a=Math.imul(t^t>>>15,1|t);return(((a=a+Math.imul(a^a>>>7,61|a)^a)^a>>>14)>>>0)/4294967296}}registerPaint("ring-particles",class{static get inputProperties(){return["--ring-radius","--ring-thickness","--particle-count","--particle-rows","--particle-color","--particle-size","--animation-tick","--particle-min-alpha","--particle-max-alpha","--ring-x","--ring-y","--fade-easing","--seed"]}constructor(){this.getRandom=t(0)}getBezierValue(t,a,r,e,n){const i=1-t,s=t*t,o=i*i;return o*i*a+3*o*t*r+3*i*s*e+s*t*n}solveBezierX(t,a,r){let e=t;for(let n=0;n<8;n++){const n=this.getBezierValue(e,0,a,r,1),i=(this.getBezierValue(e+.001,0,a,r,1)-n)/.001;if(0===i)break;e-=(n-t)/i}return Math.max(0,Math.min(1,e))}parseEasing(t){const a=t.trim();if("linear"===a)return[0,0,1,1];if("ease"===a)return[.25,.1,.25,1];if("ease-in"===a)return[.42,0,1,1];if("ease-out"===a)return[0,0,.58,1];if("ease-in-out"===a)return[.42,0,.58,1];const r=a.match(/cubic-bezier\\(([^)]+)\\)/);return r&&4===r[1].split(",").length?r[1].split(",").map(Number):[.42,0,1,1]}hash(t){let a=43758.5453123*Math.sin(t);return a-Math.floor(a)}randomInt(t,a){return Math.floor(this.getRandom()*(a-t+1))+t}randomFloat(t,a){return t+this.getRandom()*(a-t)}parseProps(t){return["--ring-radius","--ring-thickness","--ring-x","--ring-y","--particle-count","--particle-rows","--particle-color","--particle-size","--particle-min-alpha","--particle-max-alpha","--fade-easing","--animation-tick","--seed"].map(a=>{const r=t.get(a);if("undefined"==typeof CSSUnparsedValue||r instanceof CSSUnparsedValue){if(!r.length||""===r)return;switch(a){case"--ring-radius":case"--ring-thickness":case"--ring-x":case"--ring-y":case"--particle-size":case"--particle-min-alpha":case"--particle-max-alpha":return"random"!=r?parseFloat(r.toString()):r.toString().trim();case"--particle-count":case"--particle-rows":case"--fade-easing":case"--animation-tick":case"--seed":return"random"!=r?parseInt(r.toString()):r.toString().trim();default:return r.toString().trim()}}if(!(r instanceof CSSUnparsedValue)||r.length)return r instanceof CSSUnitValue?r.value:r.toString().trim()})}paint(a,r,e){let[n="random",i="random",s=50,o=50,l="random",c="random",h="random",m="random",d=0,u=1,p="ease-in",g=0,f=0]=this.parseProps(e);this.getRandom=t(f),"random"===n&&(n=this.randomInt(50,250)),"random"===i&&(i=this.randomInt(100,200)),"random"===l&&(l=this.randomInt(50,200)),"random"===c&&(c=this.randomInt(50,100)),"random"===h&&(h=`hsl(${ this.randomInt(0, 360) },${ this.randomInt(0, 100) }%, ${ this.randomInt(0, 100) }%)`),"random"===m&&(m=this.randomInt(1,3));const M=this.randomInt(2,8),I=this.randomInt(1,2),S=this.hash(f+10)>.5?1:-1,z=this.randomInt(2,9),x=-S,P=this.randomFloat(.2,.8),V=this.randomInt(8,20),k=r.width*s/100,b=r.height*o/100,[w,B,y,v]=this.parseEasing(p),C=g*Math.PI*2,R=n+i,U=i/2;a.fillStyle=h;for(let t=0;t<c;t++){const r=n+(c>1?t/(c-1):0)*i;for(let e=0;e<l;e++){const i=e/l*Math.PI*2,s=Math.sin(i*M+C*I*S)+Math.sin(i*z+1*C*x)+Math.sin(t*P+C);let o=(s+3)/6;o=Math.pow(Math.max(0,o),1.5);let c=d+o*(u-d);const h=r+s*V,p=k+Math.cos(i)*h,g=b+Math.sin(i)*h;let f=Math.min(h-n,R-h)/U;f<0&&(f=0),f>1&&(f=1);const F=this.solveBezierX(f,w,y);c*=this.getBezierValue(F,0,B,v,1),c<0&&(c=0),c>1&&(c=1),c>.01&&(a.globalAlpha=c,a.beginPath(),a.arc(p,g,m,0,2*Math.PI),a.fill())}}}});
`;

const AntigravityBackground = () => {
    const containerRef = useRef(null);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. Check support and register Worklet via Blob
        if ('paintWorklet' in CSS) {
            const blob = new Blob([WORKLET_CODE], { type: 'text/javascript' });
            const workletUrl = URL.createObjectURL(blob);

            CSS.paintWorklet.addModule(workletUrl)
                .then(() => {
                    console.log("Antigravity: PaintWorklet loaded via Blob URL");
                })
                .catch(err => {
                    console.error("Antigravity: Failed to load PaintWorklet", err);
                });

            // Cleanup URL on unmount strictly speaking not required for worklets but good practice
            // URL.revokeObjectURL(workletUrl); 
        } else {
            console.warn("Antigravity: CSS.paintWorklet is not supported in this browser.");
            setIsSupported(false);
        }

        // 2. JS-Driven Animation Loop
        let animationFrameId;
        const startTime = performance.now();

        const animate = () => {
            const now = performance.now();
            // 6 seconds per loop
            const tick = ((now - startTime) % 6000) / 6000;

            if (container) {
                container.style.setProperty('--animation-tick', tick);
                // Animate ring radius "breathing"
                const radius = 200 + Math.sin(tick * Math.PI * 2) * 50;
                container.style.setProperty('--ring-radius', radius);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        // 3. Mouse Interaction
        let isInteractive = false;
        const handlePointerMove = (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            if (!isInteractive) {
                isInteractive = true;
                container.style.setProperty('--ring-interactive', 1);
            }

            container.style.setProperty('--ring-x', (clientX / innerWidth) * 100);
            container.style.setProperty('--ring-y', (clientY / innerHeight) * 100);
        };

        const handlePointerLeave = () => {
            isInteractive = false;
            container.style.setProperty('--ring-interactive', 0);
            container.style.setProperty('--ring-x', 50);
            container.style.setProperty('--ring-y', 50);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerleave', handlePointerLeave);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerleave', handlePointerLeave);
        };
    }, []);

    return (
        <div className="antigravity-background">
            <div
                ref={containerRef}
                className="antigravity-canvas"
                style={{
                    // Hardcode initial values to ensure correct painting
                    '--particle-color': 'hsl(210, 100%, 70%)',
                    '--particle-count': 80,
                    '--ring-radius': 200,
                    '--ring-thickness': 600,
                    '--seed': 200
                }}
            />
            {/* 
            {!isSupported && (
                <div className="absolute bottom-4 right-4 text-xs text-white/30">
                    Houdini Not Supported
                </div>
            )} 
            */}
        </div>
    );
};

export default AntigravityBackground;
