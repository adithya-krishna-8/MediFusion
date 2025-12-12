import React from 'react';
import './AnimatedTitle.css';

const AnimatedTitle = () => {
    // Letters for "MediFusion"
    // M e d i F u s i o n
    // 1 2 3 4 5 6 7 8 9 10

    return (
        <div className="animated-title-wrapper" aria-label="MediFusion">
            <div className="title">
                <span data-char="M">M</span>
                <span data-char="e">e</span>
                <span data-char="d">d</span>
                <span data-char="i">i</span>
                <span data-char="F">F</span>
                <span data-char="u">u</span>
                <span data-char="s">s</span>
                <span data-char="i">i</span>
                <span data-char="o">o</span>
                <span data-char="n">n</span>
            </div>
        </div>
    );
};

export default AnimatedTitle;
