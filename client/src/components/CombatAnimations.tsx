import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Animation types for different spell schools and attack types
export type SpellEffectType = 'fireball' | 'lightning' | 'ice' | 'heal' | 'poison' | 'holy' | 'dark' | 'arcane';
export type AttackEffectType = 'slash' | 'pierce' | 'blunt';
export type AnimationType = SpellEffectType | AttackEffectType;

// Get spell effect type based on spell school
export function getSpellEffectType(school: string): SpellEffectType {
  const schoolEffects: Record<string, SpellEffectType> = {
    evocation: 'fireball',
    necromancy: 'dark',
    abjuration: 'arcane',
    conjuration: 'arcane',
    divination: 'holy',
    enchantment: 'arcane',
    illusion: 'arcane',
    transmutation: 'arcane',
  };
  return schoolEffects[school.toLowerCase()] || 'arcane';
}

// Get attack effect type based on weapon or attack name
export function getAttackEffectType(attackName: string): AttackEffectType {
  const name = attackName.toLowerCase();
  if (name.includes('sword') || name.includes('slash') || name.includes('cut') || name.includes('blade')) {
    return 'slash';
  }
  if (name.includes('arrow') || name.includes('pierce') || name.includes('stab') || name.includes('dagger')) {
    return 'pierce';
  }
  return 'blunt';
}

// Animation colors and styles
const ANIMATION_STYLES: Record<AnimationType, { color: string; particles: string; glow: string }> = {
  fireball: { color: 'bg-orange-500', particles: '🔥', glow: 'shadow-orange-500/50' },
  lightning: { color: 'bg-yellow-400', particles: '⚡', glow: 'shadow-yellow-400/50' },
  ice: { color: 'bg-cyan-400', particles: '❄️', glow: 'shadow-cyan-400/50' },
  heal: { color: 'bg-green-400', particles: '💚', glow: 'shadow-green-400/50' },
  poison: { color: 'bg-purple-500', particles: '☠️', glow: 'shadow-purple-500/50' },
  holy: { color: 'bg-yellow-200', particles: '✨', glow: 'shadow-yellow-200/50' },
  dark: { color: 'bg-purple-900', particles: '💀', glow: 'shadow-purple-900/50' },
  arcane: { color: 'bg-blue-500', particles: '🔮', glow: 'shadow-blue-500/50' },
  slash: { color: 'bg-gray-300', particles: '⚔️', glow: 'shadow-gray-300/50' },
  pierce: { color: 'bg-gray-400', particles: '🗡️', glow: 'shadow-gray-400/50' },
  blunt: { color: 'bg-amber-600', particles: '🔨', glow: 'shadow-amber-600/50' },
};

interface CombatAnimationProps {
  type: AnimationType;
  target: 'player' | 'monster';
  onComplete?: () => void;
  damage?: number;
  isHeal?: boolean;
  isCritical?: boolean;
}

export function CombatAnimation({ type, target, onComplete, damage, isHeal, isCritical }: CombatAnimationProps) {
  const [phase, setPhase] = useState<'start' | 'impact' | 'end'>('start');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  
  const style = ANIMATION_STYLES[type];
  
  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      delay: Math.random() * 0.3,
    }));
    setParticles(newParticles);
    
    // Animation phases
    const impactTimer = setTimeout(() => setPhase('impact'), 200);
    const endTimer = setTimeout(() => {
      setPhase('end');
      onComplete?.();
    }, 800);
    
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);
  
  const positionClass = target === 'monster' 
    ? 'top-1/4 right-1/4' 
    : 'bottom-1/4 left-1/4';
  
  return (
    <div className={cn(
      "absolute z-50 pointer-events-none",
      positionClass,
      "w-32 h-32 -translate-x-1/2 -translate-y-1/2"
    )}>
      {/* Main effect */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-all duration-300",
        style.color,
        style.glow,
        "shadow-2xl",
        phase === 'start' && "scale-0 opacity-0",
        phase === 'impact' && "scale-150 opacity-100",
        phase === 'end' && "scale-200 opacity-0",
        isCritical && "animate-pulse"
      )} />
      
      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            "absolute text-2xl transition-all duration-500",
            phase === 'start' && "opacity-0 scale-0",
            phase === 'impact' && "opacity-100 scale-100",
            phase === 'end' && "opacity-0 scale-150",
          )}
          style={{
            left: '50%',
            top: '50%',
            transform: phase === 'impact' 
              ? `translate(${particle.x}px, ${particle.y}px)` 
              : 'translate(-50%, -50%)',
            transitionDelay: `${particle.delay}s`,
          }}
        >
          {style.particles}
        </div>
      ))}
      
      {/* Screen flash for critical hits */}
      {isCritical && phase === 'impact' && (
        <div className="fixed inset-0 bg-white/30 animate-ping pointer-events-none" />
      )}
    </div>
  );
}

interface DamageNumberProps {
  value: number;
  target: 'player' | 'monster';
  isCritical?: boolean;
  isHeal?: boolean;
}

export function DamageNumber({ value, target, isCritical, isHeal }: DamageNumberProps) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!visible) return null;
  
  const positionClass = target === 'monster' 
    ? 'top-1/4 right-1/3' 
    : 'bottom-1/4 left-1/3';
  
  return (
    <div className={cn(
      "absolute z-50 pointer-events-none animate-bounce",
      positionClass,
      "font-bold text-4xl",
      isHeal ? "text-green-400" : isCritical ? "text-yellow-400" : "text-red-500",
      "drop-shadow-lg",
      "[text-shadow:_2px_2px_0_rgb(0_0_0),_-2px_-2px_0_rgb(0_0_0),_2px_-2px_0_rgb(0_0_0),_-2px_2px_0_rgb(0_0_0)]"
    )}
    style={{
      animation: 'damageFloat 1s ease-out forwards',
    }}
    >
      {isHeal ? '+' : '-'}{value}
      {isCritical && <span className="text-sm ml-1">CRÍTICO!</span>}
    </div>
  );
}

// Shake animation for hit effects
export function useShakeAnimation() {
  const [isShaking, setIsShaking] = useState(false);
  
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };
  
  const shakeClass = isShaking ? 'animate-shake' : '';
  
  return { shakeClass, triggerShake };
}

// Flash animation for damage
export function useFlashAnimation() {
  const [isFlashing, setIsFlashing] = useState(false);
  
  const triggerFlash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);
  };
  
  const flashClass = isFlashing ? 'brightness-200' : '';
  
  return { flashClass, triggerFlash };
}

// Sprite animation frames
interface SpriteAnimationProps {
  frames: string[];
  frameRate?: number;
  loop?: boolean;
  onComplete?: () => void;
}

export function SpriteAnimation({ frames, frameRate = 100, loop = true, onComplete }: SpriteAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  
  useEffect(() => {
    if (frames.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (loop) {
            return 0;
          } else {
            clearInterval(interval);
            onComplete?.();
            return prev;
          }
        }
        return next;
      });
    }, frameRate);
    
    return () => clearInterval(interval);
  }, [frames, frameRate, loop, onComplete]);
  
  if (frames.length === 0) return null;
  
  return (
    <img 
      src={frames[currentFrame]} 
      alt="Animation frame"
      className="w-full h-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Battle intro animation
export function BattleIntroAnimation({ monsterName, onComplete }: { monsterName: string; onComplete: () => void }) {
  const [phase, setPhase] = useState<'slide-in' | 'text' | 'ready'>('slide-in');
  
  useEffect(() => {
    const textTimer = setTimeout(() => setPhase('text'), 500);
    const readyTimer = setTimeout(() => {
      setPhase('ready');
      onComplete();
    }, 2000);
    
    return () => {
      clearTimeout(textTimer);
      clearTimeout(readyTimer);
    };
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none">
      <div className={cn(
        "text-center transition-all duration-500",
        phase === 'slide-in' && "translate-y-full opacity-0",
        phase === 'text' && "translate-y-0 opacity-100",
        phase === 'ready' && "translate-y-0 opacity-0",
      )}>
        <p className="text-white text-2xl font-bold mb-2">Um {monsterName} selvagem apareceu!</p>
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="w-3 h-3 bg-white rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Victory animation
export function VictoryAnimation({ 
  experience, 
  gold, 
  leveledUp, 
  newLevel,
  onComplete 
}: { 
  experience: number; 
  gold: number; 
  leveledUp?: boolean;
  newLevel?: number;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'victory' | 'rewards' | 'levelup' | 'done'>('victory');
  
  useEffect(() => {
    const rewardsTimer = setTimeout(() => setPhase('rewards'), 1000);
    const levelupTimer = leveledUp 
      ? setTimeout(() => setPhase('levelup'), 2500)
      : null;
    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, leveledUp ? 4000 : 3000);
    
    return () => {
      clearTimeout(rewardsTimer);
      if (levelupTimer) clearTimeout(levelupTimer);
      clearTimeout(doneTimer);
    };
  }, [leveledUp, onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="text-center">
        {phase === 'victory' && (
          <div className="animate-bounce">
            <p className="text-yellow-400 text-4xl font-bold">VITÓRIA!</p>
            <p className="text-white text-xl mt-2">🎉 ⚔️ 🎉</p>
          </div>
        )}
        
        {(phase === 'rewards' || phase === 'levelup' || phase === 'done') && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-yellow-400 text-3xl font-bold">VITÓRIA!</p>
            <div className="bg-black/50 rounded-lg p-4 space-y-2">
              <p className="text-blue-400 text-xl">+{experience} XP</p>
              <p className="text-yellow-500 text-xl">+{gold} 🪙</p>
            </div>
          </div>
        )}
        
        {phase === 'levelup' && leveledUp && (
          <div className="mt-4 animate-pulse">
            <p className="text-green-400 text-2xl font-bold">
              🎊 LEVEL UP! 🎊
            </p>
            <p className="text-white text-xl">Nível {newLevel}!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Defeat animation
export function DefeatAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="text-center animate-pulse">
        <p className="text-red-500 text-4xl font-bold">DERROTA</p>
        <p className="text-gray-400 text-xl mt-4">Você foi derrotado...</p>
        <p className="text-gray-500 text-sm mt-2">💀</p>
      </div>
    </div>
  );
}

// Add custom animations to tailwind via style tag
export function CombatAnimationStyles() {
  return (
    <style>{`
      @keyframes damageFloat {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        50% {
          transform: translateY(-30px) scale(1.2);
          opacity: 1;
        }
        100% {
          transform: translateY(-60px) scale(0.8);
          opacity: 0;
        }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      .animate-shake {
        animation: shake 0.3s ease-in-out;
      }
      
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fade-in {
        animation: fade-in 0.5s ease-out forwards;
      }
      
      @keyframes pixel-flash {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(2); }
      }
      
      .animate-pixel-flash {
        animation: pixel-flash 0.15s ease-in-out;
      }
    `}</style>
  );
}
