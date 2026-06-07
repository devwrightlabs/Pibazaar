import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  intro: 5000,
  marketplace: 4500,
  escrow: 4800,
  features: 5200,
  outro: 5000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div className="w-full h-screen overflow-hidden relative bg-black font-body">
      
      {/* Persistent Background Video */}
      <div className="absolute inset-0 opacity-40">
        <video 
          src={`${import.meta.env.BASE_URL}videos/bg-particles.mp4`}
          className="w-full h-full object-cover"
          autoPlay 
          muted 
          loop 
          playsInline
        />
        <div className="absolute inset-0 bg-black/40" /> {/* Overlay to ensure text readability */}
      </div>

      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="intro" />}
        {currentScene === 1 && <Scene2 key="marketplace" />}
        {currentScene === 2 && <Scene3 key="escrow" />}
        {currentScene === 3 && <Scene4 key="features" />}
        {currentScene === 4 && <Scene5 key="outro" />}
      </AnimatePresence>
      
    </div>
  );
}