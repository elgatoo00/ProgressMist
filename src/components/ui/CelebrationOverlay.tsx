import React, { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  scale: number;
  rotation: number;
  speed: number;
  life: number;
}

export type OverlayType = 'acceptee' | 'refusee';

interface CelebrationOverlayProps {
  show: boolean;
  type?: OverlayType;
  onComplete: () => void;
}

const ACCEPTED_EMOJIS = ['🦋', '✨', '🌟', '💜', '🎉', '🦋', '✨', '🌸', '💫', '🦋'];
const REFUSED_EMOJIS = ['💪', '🔥', '⭐', '🚀', '💜', '💪', '🔥', '✨', '🌟', '💪'];

export default function CelebrationOverlay({ show, type = 'acceptee', onComplete }: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const mousePosRef = useRef({ x: -100, y: -100 });
  const onCompleteRef = useRef(onComplete);
  const nextId = useRef(0);
  const animFrameRef = useRef<number>(0);
  const startTime = useRef(0);

  onCompleteRef.current = onComplete;

  const isAccepted = type === 'acceptee';
  const EMOJIS = isAccepted ? ACCEPTED_EMOJIS : REFUSED_EMOJIS;

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    setFadingOut(false);
    startTime.current = Date.now();
    nextId.current = 0;
    setParticles([]);

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    const spawnInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      if (elapsed > 4000) return;

      setParticles((prev) => {
        const newPart: Particle = {
          id: nextId.current++,
          x: Math.random() * window.innerWidth,
          y: -30,
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          scale: 0.6 + Math.random() * 1.4,
          rotation: Math.random() * 360,
          speed: 1 + Math.random() * 2,
          life: 1,
        };
        return [...prev.slice(-60), newPart];
      });
    }, 80);

    const animate = () => {
      const mouse = mousePosRef.current;
      setParticles((prev) =>
        prev
          .map((p) => {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const attractForce = 0.015;
            const newX = p.x + (dx / dist) * attractForce * p.speed * 8 + Math.sin(p.id * 0.5 + Date.now() * 0.002) * 0.3;
            const newY = p.y + (dy / dist) * attractForce * p.speed * 8 + Math.cos(p.id * 0.3 + Date.now() * 0.0015) * 0.4;
            const newLife = p.life - 0.0015;
            return { ...p, x: newX, y: newY, rotation: p.rotation + p.speed * 0.5, life: newLife };
          })
          .filter((p) => p.life > 0)
      );
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    const dismissTimer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        setVisible(false);
        onCompleteRef.current();
      }, 500);
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      clearInterval(spawnInterval);
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(dismissTimer);
    };
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none
        transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className={`absolute inset-0 ${isAccepted ? 'bg-black/60' : 'bg-black/50'}`} />

      <div className="relative z-10 text-center animate-scale-in">
        {isAccepted ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl md:text-6xl font-bold font-display text-white mb-3 animate-float">
              Congratulations !
            </h1>
            <p className="text-lg text-gray-300">
              Votre candidature a été acceptée ! 🎊
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">💪</div>
            <h1 className="text-4xl md:text-6xl font-bold font-display text-white mb-3 animate-float">
              Keep going !
            </h1>
            <p className="text-lg text-gray-300">
              Ne lâche rien, la bonne opportunité arrive ! 🚀
            </p>
          </>
        )}
      </div>

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            transform: `scale(${p.scale}) rotate(${p.rotation}deg)`,
            opacity: p.life,
            fontSize: `${14 + p.scale * 10}px`,
            transition: 'none',
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
