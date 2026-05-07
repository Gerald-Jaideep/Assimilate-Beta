import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationProps {
  active: boolean;
  onComplete?: () => void;
  type?: 'confetti' | 'fireworks' | 'schoolpride';
}

export const Celebration = ({ active, onComplete, type = 'confetti' }: CelebrationProps) => {
  useEffect(() => {
    if (!active) return;

    let interval: any;
    if (type === 'confetti') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899'],
        zIndex: 9999,
      });
    } else if (type === 'fireworks') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }

    const timer = onComplete ? setTimeout(onComplete, 3000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [active, type, onComplete]);

  return null;
};
