import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const HeartLogo = ({ className = "w-12 h-12" }) => {
  return (
    <motion.div
      animate={{
        scale: [1, 1.15, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="drop-shadow-[0_0_15px_rgba(255,51,51,0.8)]"
    >
      <Heart className={className} style={{ color: '#ff3333', fill: '#ff3333' }} />
    </motion.div>
  );
};

export default HeartLogo;

