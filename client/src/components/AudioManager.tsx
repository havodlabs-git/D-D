import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Music, Swords, Skull } from "lucide-react";

// Audio is disabled by default - users can enable it manually
// This prevents autoplay errors and loading issues
const AUDIO_ENABLED = false;

interface AudioManagerProps {
  gameState?: "exploring" | "combat" | "tavern" | "victory" | "defeat";
  className?: string;
}

export function AudioManager({ gameState = "exploring", className }: AudioManagerProps) {
  const [isMuted, setIsMuted] = useState(true); // Start muted to avoid errors
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Get state icon
  const getStateIcon = () => {
    switch (gameState) {
      case "combat":
        return <Swords className="w-3 h-3 text-destructive" />;
      case "defeat":
        return <Skull className="w-3 h-3 text-destructive" />;
      default:
        return <Music className="w-3 h-3 text-primary" />;
    }
  };

  // Get state label
  const getStateLabel = () => {
    switch (gameState) {
      case "combat":
        return "Modo Combate";
      case "tavern":
        return "Na Taverna";
      case "victory":
        return "Vitória!";
      case "defeat":
        return "Derrota...";
      default:
        return "Explorando";
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      {/* Audio Controls Button */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowControls(!showControls)}
          className="bg-black/80 border-primary/50 hover:bg-black/90 w-12 h-12"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Volume2 className="w-5 h-5 text-primary" />
          )}
        </Button>

        {/* Controls Panel */}
        {showControls && (
          <div className="absolute bottom-14 right-0 bg-card border border-border rounded-lg p-4 shadow-xl w-64">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Music className="w-4 h-4" />
                Som do Jogo
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 w-8 p-0"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume * 100]}
                onValueChange={(val) => setVolume(val[0] / 100)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Audio Notice */}
            <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <p>🎵 Sistema de áudio em desenvolvimento.</p>
              <p className="mt-1">Música será adicionada em breve!</p>
            </div>

            {/* Current State Indicator */}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              {getStateIcon()}
              <span>{getStateLabel()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for playing sound effects (disabled for now to prevent errors)
export function useSoundEffects() {
  const playSound = useCallback((sound: string, volume = 0.5) => {
    // Sound effects disabled to prevent loading errors
    // Will be implemented when proper audio files are available
    console.log(`[Audio] Sound effect: ${sound} (disabled)`);
  }, []);
  
  return { playSound };
}

export default AudioManager;
