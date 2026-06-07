import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dashboardImg from '@assets/pibazaar-screens/08-dashboard.jpg';
import messagesImg from '@assets/pibazaar-screens/11-messages.jpg';
import sellImg from '@assets/pibazaar-screens/06-sell.jpg';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const cardVariants = {
    hidden: { y: 100, opacity: 0, rotateX: 20 },
    visible: { y: 0, opacity: 1, rotateX: 0 }
  };

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col overflow-hidden bg-[var(--color-bg-dark)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0idHJhbnNwYXJlbnQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4=')]" />

      <div className="pt-[8%] px-[10%] text-center relative z-10">
        <motion.h2 
          className="text-[4vw] font-display font-bold text-white mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          Everything you need to <span className="text-[var(--color-primary)]">scale</span>
        </motion.h2>
      </div>

      <div className="flex-1 flex items-center justify-center gap-[4vw] px-[10%] relative z-10 perspective-[1200px]">
        
        {/* Sell Card */}
        <motion.div 
          className="flex flex-col items-center gap-6"
          variants={cardVariants}
          initial="hidden"
          animate={phase >= 2 ? "visible" : "hidden"}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="w-[18vw] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-xl">
            <img src={sellImg} className="w-full h-auto" alt="Sell Item" />
          </div>
          <span className="text-[1.5vw] font-medium text-white/80">List Items Fast</span>
        </motion.div>

        {/* Dashboard Card (Center/Elevated) */}
        <motion.div 
          className="flex flex-col items-center gap-6 z-20"
          variants={cardVariants}
          initial="hidden"
          animate={phase >= 3 ? "visible" : "hidden"}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          <div className="w-[22vw] rounded-[1.5rem] overflow-hidden border-2 border-[var(--color-primary)]/30 shadow-2xl shadow-[var(--color-primary)]/10 -mt-8">
            <img src={dashboardImg} className="w-full h-auto" alt="Dashboard" />
          </div>
          <span className="text-[1.8vw] font-semibold text-white">Seller Dashboard</span>
        </motion.div>

        {/* Messages Card */}
        <motion.div 
          className="flex flex-col items-center gap-6"
          variants={cardVariants}
          initial="hidden"
          animate={phase >= 4 ? "visible" : "hidden"}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="w-[18vw] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-xl">
            <img src={messagesImg} className="w-full h-auto" alt="Messages" />
          </div>
          <span className="text-[1.5vw] font-medium text-white/80">In-App Chat</span>
        </motion.div>

      </div>
    </motion.div>
  );
}