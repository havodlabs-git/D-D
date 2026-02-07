import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// Animation types for different spell schools and attack types
export type SpellEffectType = 'fireball' | 'lightning' | 'ice' | 'heal' | 'poison' | 'holy' | 'dark' | 'arcane';
export type AttackEffectType = 'slash' | 'pierce' | 'blunt';
export type AnimationType = SpellEffectType | AttackEffectType;

// Map animation types to their sprite paths
const EFFECT_SPRITES: Record<AnimationType, string> = {
  fireball: '/sprites/effects/fireball.png',
  lightning: '/sprites/effects/lightning.png',
  ice: '/sprites/effects/ice.png',
  heal: '/sprites/effects/heal.png',
  poison: '/sprites/effects/poison.png',
  holy: '/sprites/effects/holy.png',
  dark: '/sprites/effects/dark.png',
  arcane: '/sprites/effects/arcane.png',
  slash: '/sprites/effects/slash.png',
  pierce: '/sprites/effects/pierce.png',
  blunt: '/sprites/effects/blunt.png',
};

// Animation glow colors for each type
const GLOW_COLORS: Record<AnimationType, string> = {
  fireball: '255, 120, 0',
  lightning: '255, 255, 50',
  ice: '0, 200, 255',
  heal: '50, 255, 100',
  poison: '150, 50, 255',
  holy: '255, 230, 100',
  dark: '120, 0, 200',
  arcane: '80, 120, 255',
  slash: '200, 220, 255',
  pierce: '180, 200, 220',
  blunt: '200, 150, 80',
};

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

interface CombatAnimationProps {
  type: AnimationType;
  target: 'player' | 'monster';
  onComplete?: () => void;
  damage?: number;
  isHeal?: boolean;
  isCritical?: boolean;
}

export function CombatAnimation({ type, target, onComplete, damage, isHeal, isCritical }: CombatAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'impact' | 'exit'>('enter');
  
  const spriteSrc = EFFECT_SPRITES[type];
  const criticalSrc = '/sprites/effects/critical.png';
  const glowColor = GLOW_COLORS[type];
  
  useEffect(() => {
    // Phase timing: enter (150ms) -> impact (400ms) -> exit (250ms)
    const impactTimer = setTimeout(() => setPhase('impact'), 150);
    const exitTimer = setTimeout(() => setPhase('exit'), 550);
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 800);
    
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);
  
  // Position: monster effects appear on the right/top, player effects on the left/bottom
  const posStyle: React.CSSProperties = target === 'monster' 
    ? { top: '15%', right: '10%' } 
    : { bottom: '25%', left: '5%' };
  
  return (
    <>
      {/* Main effect sprite */}
      <div 
        className="absolute z-50 pointer-events-none"
        style={{
          ...posStyle,
          width: '160px',
          height: '160px',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <img 
          src={spriteSrc}
          alt={type}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            filter: phase === 'enter' 
              ? `drop-shadow(0 0 8px rgba(${glowColor}, 0.8)) brightness(1.5)` 
              : phase === 'impact'
              ? `drop-shadow(0 0 20px rgba(${glowColor}, 1)) drop-shadow(0 0 40px rgba(${glowColor}, 0.6)) brightness(1.3)`
              : `drop-shadow(0 0 4px rgba(${glowColor}, 0.3)) brightness(0.8)`,
            transform: phase === 'enter'
              ? 'scale(0.3) rotate(-15deg)'
              : phase === 'impact'
              ? `scale(${isCritical ? 1.4 : 1.1}) rotate(${Math.random() > 0.5 ? 5 : -5}deg)`
              : 'scale(1.6) rotate(10deg)',
            opacity: phase === 'enter' ? 0.6 : phase === 'impact' ? 1 : 0,
            transition: phase === 'enter' 
              ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' 
              : phase === 'impact'
              ? 'all 0.2s ease-out'
              : 'all 0.25s ease-in',
          }}
        />
        
        {/* Critical hit overlay - additional starburst */}
        {isCritical && (
          <img 
            src={criticalSrc}
            alt="critical"
            style={{
              position: 'absolute',
              top: '-30%',
              left: '-30%',
              width: '160%',
              height: '160%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: `drop-shadow(0 0 15px rgba(255, 200, 0, 0.9))`,
              transform: phase === 'enter'
                ? 'scale(0) rotate(-30deg)'
                : phase === 'impact'
                ? 'scale(1.2) rotate(0deg)'
                : 'scale(1.8) rotate(15deg)',
              opacity: phase === 'enter' ? 0 : phase === 'impact' ? 0.9 : 0,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              mixBlendMode: 'screen',
            }}
          />
        )}
      </div>
      
      {/* Screen flash for critical hits */}
      {isCritical && phase === 'impact' && (
        <div 
          className="absolute inset-0 z-40 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${target === 'monster' ? '70% 30%' : '30% 70%'}, rgba(255, 255, 200, 0.4), transparent 60%)`,
            animation: 'criticalFlash 0.3s ease-out',
          }}
        />
      )}
      
      {/* Particle sparks */}
      {phase === 'impact' && (
        <div className="absolute z-50 pointer-events-none" style={posStyle}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: `rgba(${glowColor}, 0.9)`,
                boxShadow: `0 0 6px rgba(${glowColor}, 0.8)`,
                animation: `sparkParticle 0.5s ease-out ${i * 0.05}s forwards`,
                transform: `rotate(${i * 60}deg) translateX(20px)`,
              }}
            />
          ))}
        </div>
      )}
    </>
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
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);
  
  if (!visible) return null;
  
  const posStyle: React.CSSProperties = target === 'monster' 
    ? { top: '20%', right: '20%' } 
    : { bottom: '30%', left: '20%' };
  
  const fontSize = isCritical ? '28px' : '22px';
  const color = isHeal ? '#4ade80' : isCritical ? '#fbbf24' : '#ef4444';
  const shadowColor = isHeal ? '0, 180, 80' : isCritical ? '200, 150, 0' : '200, 0, 0';
  
  return (
    <div 
      className="absolute z-[60] pointer-events-none"
      style={{
        ...posStyle,
        fontFamily: "'Press Start 2P', monospace",
        fontSize,
        fontWeight: 'bold',
        color,
        textShadow: `
          2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000,
          0 0 10px rgba(${shadowColor}, 0.8),
          0 0 20px rgba(${shadowColor}, 0.4)
        `,
        animation: 'damageFloat 1.2s ease-out forwards',
        imageRendering: 'pixelated',
      }}
    >
      {isHeal ? '+' : '-'}{value}
      {isCritical && (
        <div style={{ 
          fontSize: '10px', 
          color: '#fbbf24', 
          textAlign: 'center',
          marginTop: '2px',
          animation: 'criticalPulse 0.3s ease-in-out 3',
        }}>
          CRÍTICO!
        </div>
      )}
    </div>
  );
}

// Shake animation for hit effects
export function useShakeAnimation() {
  const [isShaking, setIsShaking] = useState(false);
  
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  }, []);
  
  const shakeClass = isShaking ? 'animate-shake' : '';
  
  return { shakeClass, triggerShake };
}

// Flash animation for damage
export function useFlashAnimation() {
  const [isFlashing, setIsFlashing] = useState(false);
  
  const triggerFlash = useCallback(() => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);
  }, []);
  
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none">
      <div className={cn(
        "text-center transition-all duration-500",
        phase === 'slide-in' && "translate-y-full opacity-0",
        phase === 'text' && "translate-y-0 opacity-100",
        phase === 'ready' && "translate-y-0 opacity-0",
      )}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px', color: '#fff', textShadow: '2px 2px 0 #000' }}>
          Um {monsterName} selvagem apareceu!
        </p>
        <div className="flex justify-center gap-2 mt-4">
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="text-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        {phase === 'victory' && (
          <div style={{ animation: 'victoryBounce 0.6s ease-out' }}>
            <p style={{ fontSize: '20px', color: '#fbbf24', textShadow: '2px 2px 0 #000, 0 0 20px rgba(255,200,0,0.5)' }}>
              VITÓRIA!
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <img src="/sprites/effects/holy.png" alt="" style={{ width: '48px', height: '48px', imageRendering: 'pixelated', animation: 'sparkle 0.8s ease-in-out infinite' }} />
              <img src="/sprites/effects/critical.png" alt="" style={{ width: '48px', height: '48px', imageRendering: 'pixelated', animation: 'sparkle 0.8s ease-in-out 0.2s infinite' }} />
              <img src="/sprites/effects/holy.png" alt="" style={{ width: '48px', height: '48px', imageRendering: 'pixelated', animation: 'sparkle 0.8s ease-in-out 0.4s infinite' }} />
            </div>
          </div>
        )}
        
        {(phase === 'rewards' || phase === 'levelup') && (
          <div style={{ animation: 'fadeSlideIn 0.5s ease-out' }}>
            <p style={{ fontSize: '16px', color: '#fbbf24', textShadow: '2px 2px 0 #000', marginBottom: '12px' }}>
              VITÓRIA!
            </p>
            <div style={{ 
              background: 'rgba(0,0,0,0.6)', 
              border: '2px solid rgba(255,200,0,0.3)', 
              borderRadius: '4px', 
              padding: '12px 20px',
            }}>
              <p style={{ fontSize: '11px', color: '#60a5fa', marginBottom: '6px' }}>+{experience} XP</p>
              <p style={{ fontSize: '11px', color: '#eab308' }}>+{gold} Ouro</p>
            </div>
          </div>
        )}
        
        {phase === 'levelup' && leveledUp && (
          <div style={{ marginTop: '16px', animation: 'levelUpPulse 0.5s ease-out' }}>
            <p style={{ fontSize: '14px', color: '#4ade80', textShadow: '0 0 15px rgba(50,255,100,0.6)' }}>
              LEVEL UP!
            </p>
            <p style={{ fontSize: '11px', color: '#fff', marginTop: '4px' }}>Nível {newLevel}!</p>
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="text-center" style={{ fontFamily: "'Press Start 2P', monospace", animation: 'defeatFade 1s ease-out' }}>
        <img src="/sprites/effects/dark.png" alt="" style={{ width: '64px', height: '64px', imageRendering: 'pixelated', margin: '0 auto 12px', opacity: 0.7 }} />
        <p style={{ fontSize: '18px', color: '#ef4444', textShadow: '2px 2px 0 #000, 0 0 15px rgba(200,0,0,0.5)' }}>
          DERROTA
        </p>
        <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '12px' }}>Você foi derrotado...</p>
      </div>
    </div>
  );
}

// All custom CSS animations
export function CombatAnimationStyles() {
  return (
    <style>{`
      @keyframes damageFloat {
        0% {
          transform: translateY(0) scale(0.5);
          opacity: 0;
        }
        15% {
          transform: translateY(-5px) scale(1.3);
          opacity: 1;
        }
        30% {
          transform: translateY(-15px) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(-50px) scale(0.7);
          opacity: 0;
        }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }
      
      .animate-shake {
        animation: shake 0.3s ease-in-out;
      }
      
      @keyframes criticalFlash {
        0% { opacity: 0.6; }
        100% { opacity: 0; }
      }
      
      @keyframes criticalPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      
      @keyframes sparkParticle {
        0% {
          transform: rotate(var(--angle, 0deg)) translateX(10px);
          opacity: 1;
        }
        100% {
          transform: rotate(var(--angle, 0deg)) translateX(60px);
          opacity: 0;
        }
      }
      
      @keyframes sparkle {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
        50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
      }
      
      @keyframes victoryBounce {
        0% { transform: scale(0) translateY(20px); opacity: 0; }
        60% { transform: scale(1.2) translateY(-5px); opacity: 1; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      
      @keyframes fadeSlideIn {
        0% { transform: translateY(15px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes levelUpPulse {
        0% { transform: scale(0.5); opacity: 0; }
        60% { transform: scale(1.15); }
        100% { transform: scale(1); opacity: 1; }
      }
      
      @keyframes defeatFade {
        0% { transform: scale(1.2); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
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
