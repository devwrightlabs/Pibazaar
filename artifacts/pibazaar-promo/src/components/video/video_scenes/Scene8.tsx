import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene8() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 6000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 bg-black" />
      
      {/* Dynamic Background glow */}
      <motion.div 
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(240,192,64,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0, opacity: 0, rotate: -180 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
          className="w-32 h-32 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-display font-bold text-6xl text-black mb-8 shadow-[0_0_50px_rgba(240,192,64,0.4)]"
        >
          π
        </motion.div>

        <motion.h1 
          className="text-[7vw] font-display font-black text-white leading-none tracking-tighter"
          initial={{ y: 50, opacity: 0, filter: 'blur(20px)' }}
          animate={phase >= 2 ? { y: 0, opacity: 1, filter: 'blur(0px)' } : { y: 50, opacity: 0, filter: 'blur(20px)' }}
          transition={{ duration: 1, type: 'spring' }}
        >
          PiBazaar
        </motion.h1>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 3 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-8 overflow-hidden rounded-full border-2 border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 backdrop-blur-sm px-10 py-4"
        >
          <p className="text-[2.2vw] text-[var(--color-primary)] font-semibold tracking-wide">
            Start Trading With Pi Today
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
