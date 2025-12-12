import React, { useEffect, useRef } from 'react';
import TubesCursor from './tubesCursor'; // Import the downloaded script locally
import './TubesBackground.css';

const TubesBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize TubesCursor
        const app = TubesCursor(canvasRef.current, {
            tubes: {
                colors: ["#f967fb", "#53bc28", "#6958d5"],
                lights: {
                    intensity: 200,
                    colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
                }
            }
        });

        // Helper to generate random colors
        const randomColors = (count) => {
            return new Array(count)
                .fill(0)
                .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        };

        // Click handler to randomize colors
        const handleClick = () => {
            const colors = randomColors(3);
            const lightsColors = randomColors(4);
            // console.log(colors, lightsColors);
            if (app && app.tubes) {
                app.tubes.setColors(colors);
                app.tubes.setLightsColors(lightsColors);
            }
        };

        document.body.addEventListener('click', handleClick);

        // Cleanup
        return () => {
            document.body.removeEventListener('click', handleClick);
            // If the library has a dispose method, call it here.
            // Based on typical threejs-component patterns, removing the canvas or similar might be enough,
            // but without specific docs we just ensure we don't leak listeners.
        };
    }, []);

    return (
        <div className="tubes-background-container">
            <canvas ref={canvasRef} id="canvas" />
        </div>
    );
};

export default TubesBackground;
