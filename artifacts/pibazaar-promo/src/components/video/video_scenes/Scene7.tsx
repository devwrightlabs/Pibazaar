import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ordersImg from '@assets/pibazaar-screens/10-orders.jpg';
import profileImg from '@assets/pibazaar-screens/09-profile.jpg';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 6500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center overflow-hidden bg-[var(--color-bg-dark)]"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-[50%] relative h-full flex items-center justify-center perspective-[1200px]">
        {/* Profile Image */}
        <motion.div
          className="absolute w-[22vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-0 right-[15%]"
          initial={{ opacity: 0, y: -100, rotateY: 30, x: -50 }}
          animate={phase >= 2 ? { opacity: 0.6, y: -20, rotateY: 15, x: 0, z: -200 } : { opacity: 0, y: -100, rotateY: 30, x: -50 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        >
          <img src={profileImg} className="w-full h-auto" alt="Profile" />
        </motion.div>
        
        {/* Orders Image */}
        <motion.div
          className="absolute w-[24vw] rounded-[2rem] overflow-hidden border-2 border-white/20 shadow-2xl z-10 left-[15%]"
          initial={{ opacity: 0, y: 150, rotateY: -20, x: 50 }}
          animate={phase >= 3 ? { opacity: 1, y: 20, rotateY: 5, x: 0, z: 0 } : { opacity: 0, y: 150, rotateY: -20, x: 50 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
        >
          <img src={ordersImg} className="w-full h-auto" alt="Orders Tracking" />
        </motion.div>
      </div>

      <div className="w-[50%] pr-[8%] relative z-10 flex flex-col justify-center items-end text-right">
        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-[1.1] mb-6 text-white"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 1, type: 'spring' }}
        >
          Track Every <br/>
          <span className="text-[var(--color-primary)]">Order.</span>
        </motion.h2>
        
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.8vw] text-zinc-400">
            Real-time status updates from payment to delivery.
          </p>
          <p className="text-[1.8vw] text-zinc-400">
            Manage your reputation and build trust.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
