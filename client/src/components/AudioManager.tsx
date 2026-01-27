import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Music, Swords, Skull } from "lucide-react";

// Audio tracks - using Pixabay free medieval music CDN
const AUDIO_TRACKS = {
  ambient: [
    "https://cdn.pixabay.com/audio/2024/11/04/audio_a2d7f1b3c2.mp3", // Medieval ambient
    "https://cdn.pixabay.com/audio/2022/10/25/audio_52c2d8b4c1.mp3", // Fantasy ambient
  ],
  combat: [
    "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749d484.mp3", // Epic battle
    "https://cdn.pixabay.com/audio/2024/02/14/audio_8a3e3e4c8a.mp3", // Combat drums
  ],
  tavern: [
    "https://cdn.pixabay.com/audio/2023/09/04/audio_4b8b6e4a8c.mp3", // Tavern music
  ],
  victory: [
    "https://cdn.pixabay.com/audio/2022/03/10/audio_d0c8e8b7c8.mp3", // Victory fanfare
  ],
  defeat: [
    "https://cdn.pixabay.com/audio/2021/08/04/audio_c8b8e8b7c8.mp3", // Defeat sound
  ],
};

// Sound effects
const SOUND_EFFECTS = {
  hit: "/sounds/hit.mp3",
  miss: "/sounds/miss.mp3",
  levelUp: "/sounds/levelup.mp3",
  gold: "/sounds/gold.mp3",
  spell: "/sounds/spell.mp3",
  click: "/sounds/click.mp3",
};

interface AudioManagerProps {
  gameState?: "exploring" | "combat" | "tavern" | "victory" | "defeat";
  className?: string;
}

export function AudioManager({ gameState = "exploring", className }: AudioManagerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // Fade out current track and fade in new track
  const crossfade = useCallback((newTrackUrl: string) => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const targetVolume = isMuted ? 0 : volume;
    
    // If same track, don't restart
    if (currentTrack === newTrackUrl && isPlaying) return;
    
    // Fade out current
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    
    let currentVol = audio.volume;
    fadeIntervalRef.current = setInterval(() => {
      currentVol -= 0.05;
      if (currentVol <= 0) {
        clearInterval(fadeIntervalRef.current!);
        audio.pause();
        audio.src = newTrackUrl;
        audio.volume = 0;
        audio.play().then(() => {
          setIsPlaying(true);
          setCurrentTrack(newTrackUrl);
          // Fade in
          fadeIntervalRef.current = setInterval(() => {
            if (audio.volume < targetVolume) {
              audio.volume = Math.min(audio.volume + 0.05, targetVolume);
            } else {
              clearInterval(fadeIntervalRef.current!);
            }
          }, 100);
        }).catch(console.error);
      } else {
        audio.volume = currentVol;
      }
    }, 100);
  }, [currentTrack, isPlaying, isMuted, volume]);

  // Change track based on game state
  useEffect(() => {
    if (!audioRef.current) return;
    
    let tracks: string[] = [];
    switch (gameState) {
      case "combat":
        tracks = AUDIO_TRACKS.combat;
        break;
      case "tavern":
        tracks = AUDIO_TRACKS.tavern;
        break;
      case "victory":
        tracks = AUDIO_TRACKS.victory;
        break;
      case "defeat":
        tracks = AUDIO_TRACKS.defeat;
        break;
      default:
        tracks = AUDIO_TRACKS.ambient;
    }
    
    if (tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      crossfade(randomTrack);
    }
  }, [gameState, crossfade]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Start playing (user interaction required)
  const startPlaying = () => {
    if (audioRef.current && !isPlaying) {
      const tracks = AUDIO_TRACKS.ambient;
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      audioRef.current.src = randomTrack;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setCurrentTrack(randomTrack);
      }).catch(console.error);
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

            {/* Play Button (if not playing) */}
            {!isPlaying && (
              <Button
                onClick={startPlaying}
                className="w-full mt-4"
                size="sm"
              >
                <Music className="w-4 h-4 mr-2" />
                Iniciar Música
              </Button>
            )}

            {/* Current State Indicator */}
            {isPlaying && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                {gameState === "combat" ? (
                  <Swords className="w-3 h-3 text-destructive" />
                ) : gameState === "defeat" ? (
                  <Skull className="w-3 h-3 text-destructive" />
                ) : (
                  <Music className="w-3 h-3 text-primary" />
                )}
                <span>
                  {gameState === "combat" ? "Música de Combate" :
                   gameState === "tavern" ? "Música de Taverna" :
                   gameState === "victory" ? "Vitória!" :
                   gameState === "defeat" ? "Derrota..." :
                   "Música Ambiente"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for playing sound effects
export function useSoundEffects() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  const playSound = useCallback((sound: keyof typeof SOUND_EFFECTS, volume = 0.5) => {
    const url = SOUND_EFFECTS[sound];
    if (!url) return;
    
    let audio = audioCache.current.get(url);
    if (!audio) {
      audio = new Audio(url);
      audioCache.current.set(url, audio);
    }
    
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }, []);
  
  return { playSound };
}

export default AudioManager;
