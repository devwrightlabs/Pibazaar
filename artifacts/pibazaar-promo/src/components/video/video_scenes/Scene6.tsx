import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import messagesImg from '@assets/pibazaar-screens/11-messages.jpg';
import notificationsImg from '@assets/pibazaar-screens/12-notifications.jpg';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 6500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-black"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05)_0%,transparent_60%)]" />

      <div className="text-center relative z-10 mb-10">
        <motion.h2 
          className="text-[4vw] font-display font-bold text-white mb-2"
          initial={{ opacity: 0, y: -30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          Seamless <span className="text-[var(--color-primary)]">Communication</span>
        </motion.h2>
        <motion.p
          className="text-[1.8vw] text-zinc-400"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          In-app messaging and real-time notifications.
        </motion.p>
      </div>

      <div className="flex items-center justify-center gap-12 perspective-[1200px]">
        {/* Notifications */}
        <motion.div
          className="w-[22vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-xl"
          initial={{ opacity: 0, x: -100, rotateY: -20, rotateZ: -5 }}
          animate={phase >= 2 ? { opacity: 0.8, x: 0, rotateY: 10, rotateZ: -2 } : { opacity: 0, x: -100, rotateY: -20, rotateZ: -5 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
        >
          <img src={notificationsImg} className="w-full h-auto" alt="Notifications" />
        </motion.div>

        {/* Messages */}
        <motion.div
          className="w-[24vw] rounded-[2rem] overflow-hidden border-2 border-[var(--color-primary)]/40 shadow-2xl shadow-[var(--color-primary)]/10 z-20"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.8 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
        >
          <img src={messagesImg} className="w-full h-auto" alt="Messages" />
        </motion.div>
      </div>
    </motion.div>
  );
}
