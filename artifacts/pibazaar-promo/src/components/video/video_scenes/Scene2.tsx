import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import homeImg from '@assets/pibazaar-screens/02-home.jpg';
import browseImg from '@assets/pibazaar-screens/04-browse.jpg';
import searchFilterImg from '@assets/pibazaar-screens/13-search-filter.jpg';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500),
      setTimeout(() => setPhase(5), 7500), // begin exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center overflow-hidden bg-[var(--color-bg-dark)]"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-50%', opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute w-[80vw] h-[80vw] bg-[var(--color-primary)]/10 rounded-full blur-[120px] top-[-20%] left-[-10%]" />

      <div className="w-[45%] px-[8%] relative z-10">
        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-[1.1] mb-6"
          initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
          animate={phase >= 1 ? { opacity: 1, x: 0, filter: 'blur(0px)' } : { opacity: 0, x: -50, filter: 'blur(10px)' }}
          transition={{ duration: 1, type: 'spring' }}
        >
          Discover <br/>
          <span className="text-[var(--color-primary)]">Everything</span>
        </motion.h2>
        
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.8vw] text-[var(--color-text-secondary)]">
            Explore thousands of real items listed by the community.
          </p>
          <p className="text-[1.8vw] text-[var(--color-text-secondary)]">
            Powerful search and precise filtering.
          </p>
        </motion.div>
      </div>

      <div className="w-[55%] relative h-full flex items-center justify-center perspective-[1200px]">
        {/* Browse / Filter Image - background */}
        <motion.div
          className="absolute w-[22vw] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl z-0 left-[10%]"
          initial={{ opacity: 0, z: -800, rotateY: 30, x: 100 }}
          animate={phase >= 2 ? { opacity: 0.8, z: -200, rotateY: 15, x: 0, y: -40 } : { opacity: 0, z: -800, rotateY: 30, x: 100 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.2 }}
        >
          <img src={searchFilterImg} className="w-full h-auto" alt="Search & Filter" />
        </motion.div>
        
        {/* Browse Image - midground */}
        <motion.div
          className="absolute w-[22vw] rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl z-10 right-[15%]"
          initial={{ opacity: 0, y: 150, rotateY: -40, x: -50 }}
          animate={phase >= 3 ? { opacity: 0.9, y: 20, rotateY: -10, x: 0, z: -100 } : { opacity: 0, y: 150, rotateY: -40, x: -50 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        >
          <img src={browseImg} className="w-full h-auto" alt="Browse" />
        </motion.div>

        {/* Home Image - foreground */}
        <motion.div
          className="absolute w-[24vw] rounded-[2rem] overflow-hidden border-2 border-[var(--color-primary)]/40 shadow-[0_0_50px_rgba(240,192,64,0.2)] z-20"
          initial={{ opacity: 0, scale: 0.5, y: -100 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1, y: 0, rotateY: 5 } : { opacity: 0, scale: 0.5, y: -100 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
        >
          <img src={homeImg} className="w-full h-auto" alt="Home" />
        </motion.div>
      </div>
    </motion.div>
  );
}
