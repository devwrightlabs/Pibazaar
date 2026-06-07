import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-black" />
      
      {/* Background glow */}
      <motion.div 
        className="absolute w-[60vw] h-[60vw] bg-[var(--color-primary)]/15 rounded-full blur-[100px]"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
          className="w-24 h-24 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-display font-bold text-5xl text-black mb-8"
        >
          π
        </motion.div>

        <motion.h1 
          className="text-[6vw] font-display font-bold text-white leading-tight"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          PiBazaar
        </motion.h1>

        <motion.p
          className="text-[2vw] text-zinc-400 mt-4"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 3 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          The marketplace is open. Start trading with Pi today.
        </motion.p>
      </div>
    </motion.div>
  );
}