import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import loginImg from '@assets/pibazaar-screens/01-login.jpg';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 4500), // begin exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] to-[#1a1405]" />
      
      {/* Decorative elements */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] rounded-full border border-[var(--color-primary)]/20 top-1/2 left-1/2"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-display font-bold text-2xl text-black">π</div>
          <span className="font-display text-4xl font-bold tracking-tight">PiBazaar</span>
        </motion.div>

        <motion.h1 
          className="text-[6vw] leading-none font-display font-black tracking-tighter"
          style={{ backgroundImage: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          REAL VALUE.<br />REAL COMMERCE.
        </motion.h1>

        <motion.p
          className="text-2xl text-[var(--color-primary)] mt-6 font-medium tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          The premier P2P marketplace on Pi Network
        </motion.p>
      </div>

      <motion.div
        className="absolute right-[10%] top-[15%] w-[22vw] rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl shadow-[var(--color-primary)]/20"
        initial={{ opacity: 0, x: 100, rotateY: 30, scale: 0.8 }}
        animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: -15, scale: 1 } : { opacity: 0, x: 100, rotateY: 30, scale: 0.8 }}
        transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        style={{ perspective: 1000 }}
      >
        <img src={loginImg} className="w-full h-auto" alt="Login" />
      </motion.div>
    </motion.div>
  );
}