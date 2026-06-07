import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import homeImg from '@assets/pibazaar-screens/02-home.jpg';
import marketplaceImg from '@assets/pibazaar-screens/03-marketplace.jpg';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center overflow-hidden bg-[var(--color-bg-dark)]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%', opacity: 0.5 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute w-[80vw] h-[80vw] bg-[var(--color-primary)]/10 rounded-full blur-[120px] top-[-20%] left-[-10%]" />

      <div className="w-1/2 px-[8%] relative z-10">
        <motion.h2 
          className="text-[5vw] font-display font-bold leading-[1.1] mb-6"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          Buy & Sell <br/>
          <span className="text-[var(--color-primary)]">Anything</span>
        </motion.h2>
        
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[1.8vw] text-[var(--color-text-secondary)]">
            Browse thousands of real products.
          </p>
          <p className="text-[1.8vw] text-[var(--color-text-secondary)]">
            List your items in seconds.
          </p>
          <p className="text-[1.8vw] text-[var(--color-text-secondary)]">
            Transact entirely in Pi.
          </p>
        </motion.div>
      </div>

      <div className="w-1/2 relative h-full flex items-center justify-center perspective-[1000px]">
        <motion.div
          className="absolute w-[20vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
          initial={{ opacity: 0, z: -500, rotateY: 20, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, z: 0, rotateY: -10, x: -20, y: 40 } : { opacity: 0, z: -500, rotateY: 20, x: -50 }}
          transition={{ duration: 1, type: 'spring' }}
        >
          <img src={marketplaceImg} className="w-full h-auto" alt="Marketplace" />
        </motion.div>
        
        <motion.div
          className="absolute w-[22vw] rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl shadow-[var(--color-primary)]/20 z-10"
          initial={{ opacity: 0, y: 100, rotateY: -30, x: 50 }}
          animate={phase >= 3 ? { opacity: 1, y: -20, rotateY: 5, x: 20 } : { opacity: 0, y: 100, rotateY: -30, x: 50 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          <img src={homeImg} className="w-full h-auto" alt="Home" />
        </motion.div>
      </div>
    </motion.div>
  );
}