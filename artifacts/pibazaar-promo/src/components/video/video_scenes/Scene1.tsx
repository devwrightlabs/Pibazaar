import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import loginImg from '@assets/pibazaar-screens/01-login.jpg';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5200), // begin exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] to-[#1a1405]" />
      
      {/* Decorative elements */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] rounded-full border border-[var(--color-primary)]/20 top-1/2 left-1/2"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1], rotate: 180 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute w-[60vw] h-[60vw] rounded-full border border-[var(--color-primary)]/10 top-1/2 left-1/2"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.1, 0.3], rotate: -180 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.4 }}
          className="mb-8 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-display font-bold text-4xl text-black shadow-lg shadow-[var(--color-primary)]/40">π</div>
          <span className="font-display text-5xl font-bold tracking-tight">PiBazaar</span>
        </motion.div>

        <motion.h1 
          className="text-[6vw] leading-none font-display font-black tracking-tighter mb-4"
          style={{ backgroundImage: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', y: 20 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(10px)', y: 20 }}
          transition={{ duration: 1, delay: 0.1, type: 'spring' }}
        >
          REAL VALUE.<br />REAL COMMERCE.
        </motion.h1>

        <motion.p
          className="text-[2.2vw] text-[var(--color-primary)] mt-6 font-medium tracking-wide"
          initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
          animate={phase >= 3 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 20, filter: 'blur(5px)' }}
          transition={{ duration: 0.8 }}
        >
          The premier P2P marketplace on Pi Network
        </motion.p>
      </div>

      <motion.div
        className="absolute right-[8%] top-[10%] w-[24vw] rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl shadow-[var(--color-primary)]/30"
        initial={{ opacity: 0, x: 200, rotateY: 45, scale: 0.7 }}
        animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: -15, scale: 1 } : { opacity: 0, x: 200, rotateY: 45, scale: 0.7 }}
        transition={{ duration: 1.5, type: 'spring', bounce: 0.3 }}
        style={{ perspective: 1200 }}
      >
        <img src={loginImg} className="w-full h-auto" alt="Login" />
      </motion.div>
    </motion.div>
  );
}
