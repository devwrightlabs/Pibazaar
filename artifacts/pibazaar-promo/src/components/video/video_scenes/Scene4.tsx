import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import checkoutImg from '@assets/pibazaar-screens/15-checkout.jpg';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 7000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_50%)] opacity-[0.08]" />

      <motion.div 
        className="text-center mb-12 relative z-10"
        initial={{ y: -50, opacity: 0, filter: 'blur(10px)' }}
        animate={phase >= 1 ? { y: 0, opacity: 1, filter: 'blur(0px)' } : { y: -50, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 1, type: 'spring' }}
      >
        <h2 className="text-[4.5vw] font-display font-bold text-white mb-4">
          Protected by <span className="text-[var(--color-primary)]">Pi Escrow</span>
        </h2>
        <p className="text-[2vw] text-zinc-400">Funds are held securely until delivery is confirmed</p>
      </motion.div>

      <div className="flex items-center gap-16">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ x: -100, opacity: 0 }}
          animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-zinc-800 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <svg className="w-12 h-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-[1.5vw] font-medium text-zinc-300">Buyer Protection</span>
        </motion.div>

        <motion.div
          className="w-[24vw] rounded-[2rem] overflow-hidden border-4 border-[var(--color-primary)]/60 shadow-[0_0_80px_rgba(240,192,64,0.3)] relative z-20"
          initial={{ scale: 0.5, opacity: 0, rotateZ: -10 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1, rotateZ: 0 } : { scale: 0.5, opacity: 0, rotateZ: -10 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
        >
          <img src={checkoutImg} className="w-full h-auto" alt="Checkout" />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ x: 100, opacity: 0 }}
          animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 100, opacity: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-[var(--color-primary)] shadow-[0_0_30px_rgba(240,192,64,0.2)]">
            <svg className="w-12 h-12 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-[1.5vw] font-medium text-[var(--color-primary)]">Verified Delivery</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
