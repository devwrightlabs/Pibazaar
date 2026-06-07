import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import productDetailImg from '@assets/pibazaar-screens/05-product-detail.jpg';
import productBuyImg from '@assets/pibazaar-screens/14-product-buy.jpg';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 6500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A0F0D]"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, y: '50%' }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_50%)] opacity-[0.1]" />

      <div className="w-[50%] flex justify-center items-center relative h-full perspective-[1000px]">
        <motion.div
          className="absolute w-[24vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-0"
          initial={{ x: -100, rotateY: -30, opacity: 0 }}
          animate={phase >= 1 ? { x: -80, rotateY: -15, opacity: 0.5, scale: 0.9 } : { x: -100, rotateY: -30, opacity: 0 }}
          transition={{ duration: 1.2, type: 'spring' }}
        >
          <img src={productDetailImg} className="w-full h-auto" alt="Product Detail" />
        </motion.div>

        <motion.div
          className="absolute w-[26vw] rounded-[2rem] overflow-hidden border-2 border-[var(--color-primary)]/50 shadow-2xl shadow-[var(--color-primary)]/20 z-10"
          initial={{ x: 100, opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { x: 40, opacity: 1, scale: 1, rotateY: 5 } : { x: 100, opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
        >
          <img src={productBuyImg} className="w-full h-auto" alt="Buy with Pi" />
        </motion.div>
      </div>

      <div className="w-[50%] px-[8%] relative z-10 flex flex-col justify-center">
        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-[1.1] mb-6 text-white"
          initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
          animate={phase >= 1 ? { opacity: 1, x: 0, filter: 'blur(0px)' } : { opacity: 0, x: 50, filter: 'blur(10px)' }}
          transition={{ duration: 1, type: 'spring' }}
        >
          Transact Entirely <br/>
          <span className="text-[var(--color-primary)]">in Pi.</span>
        </motion.h2>
        
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.8vw] text-zinc-400">
            Every listing priced in Pi. No fiat currency required.
          </p>
          <p className="text-[1.8vw] text-[var(--color-primary)] font-medium">
            Seamless integration with your Pi Wallet.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
