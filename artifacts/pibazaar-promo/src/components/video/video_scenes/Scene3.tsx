import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import checkoutImg from '@assets/pibazaar-screens/15-checkout.jpg';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0A0F0D]"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)_0%,transparent_60%)] opacity-[0.05]" />

      <motion.div 
        className="text-center mb-12 relative z-10"
        initial={{ y: -50, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: -50, opacity: 0 }}
        transition={{ duration: 0.8, type: 'spring' }}
      >
        <h2 className="text-[4.5vw] font-display font-bold text-white mb-4">
          Protected by <span className="text-[var(--color-primary)]">Pi Escrow</span>
        </h2>
        <p className="text-[2vw] text-zinc-400">Funds are held securely until delivery is confirmed</p>
      </motion.div>

      <div className="flex items-center gap-12">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ x: -50, opacity: 0 }}
          animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
            <svg className="w-10 h-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-medium text-white">Buyer Protection</span>
        </motion.div>

        <motion.div
          className="w-[24vw] rounded-[2rem] overflow-hidden border-2 border-[var(--color-primary)]/40 shadow-2xl shadow-[var(--color-primary)]/20 relative z-20"
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { y: 0, opacity: 1, scale: 1 } : { y: 100, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          <img src={checkoutImg} className="w-full h-auto" alt="Checkout" />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ x: 50, opacity: 0 }}
          animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
            <svg className="w-10 h-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xl font-medium text-white">Verified Delivery</span>
        </motion.div>
      </div>
    </motion.div>
  );
}