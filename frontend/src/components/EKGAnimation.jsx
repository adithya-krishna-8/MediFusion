import React from 'react';
import { motion } from 'framer-motion';

const EKGAnimation = () => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <svg
        viewBox="0 0 400 100"
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0 50 L 50 50 L 60 30 L 70 70 L 80 50 L 130 50 L 140 20 L 150 80 L 160 50 L 210 50 L 220 40 L 230 60 L 240 50 L 290 50 L 300 25 L 310 75 L 320 50 L 370 50 L 400 50"
          fill="none"
          stroke="#ff3333"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </svg>
      <p className="text-center text-slate-300 mt-4 font-medium">
        AI is consulting medical knowledge...
      </p>
    </div>
  );
};

export default EKGAnimation;

