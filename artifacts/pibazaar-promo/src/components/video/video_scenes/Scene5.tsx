import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dashboardImg from '@assets/pibazaar-screens/08-dashboard.jpg';
import sellImg from '@assets/pibazaar-screens/06-sell.jpg';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 7000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center overflow-hidden bg-[var(--color-bg-dark)]"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-[45%] pl-[8%] relative z-10 flex flex-col justify-center">
        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-[1.1] mb-6 text-white"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 1, type: 'spring' }}
        >
          Scale Your <br/>
          <span className="text-[var(--color-primary)]">Business.</span>
        </motion.h2>
        
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.8vw] text-zinc-400">
            List items in seconds with intuitive tools.
          </p>
          <p className="text-[1.8vw] text-zinc-400">
            Manage your empire from a powerful seller dashboard.
          </p>
        </motion.div>
      </div>

      <div className="w-[55%] relative h-full flex items-center justify-center perspective-[1200px]">
        {/* Sell Image */}
        <motion.div
          className="absolute w-[22vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-0 right-[25%]"
          initial={{ opacity: 0, y: -100, rotateY: -30, x: -50 }}
          animate={phase >= 2 ? { opacity: 0.7, y: -30, rotateY: -15, x: 0, z: -200 } : { opacity: 0, y: -100, rotateY: -30, x: -50 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        >
          <img src={sellImg} className="w-full h-auto" alt="Sell Item" />
        </motion.div>
        
        {/* Dashboard Image */}
        <motion.div
          className="absolute w-[26vw] rounded-[2rem] overflow-hidden border-2 border-[var(--color-primary)]/40 shadow-[0_0_60px_rgba(240,192,64,0.15)] z-10 left-[15%]"
          initial={{ opacity: 0, y: 150, rotateY: 40, x: 100 }}
          animate={phase >= 3 ? { opacity: 1, y: 30, rotateY: 10, x: 0, z: 0 } : { opacity: 0, y: 150, rotateY: 40, x: 100 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
        >
          <img src={dashboardImg} className="w-full h-auto" alt="Dashboard" />
        </motion.div>
      </div>
    </motion.div>
  );
}
