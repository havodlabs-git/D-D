// Audio System for D&D GO
// Handles background music, sound effects, and ambient sounds

type SoundCategory = 'music' | 'sfx' | 'ambient' | 'ui';

interface AudioTrack {
  id: string;
  url: string;
  category: SoundCategory;
  volume: number;
  loop: boolean;
}

interface AudioState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  uiVolume: number;
  muted: boolean;
}

// Sound effect URLs (using Web Audio API oscillators for retro feel)
const SOUND_EFFECTS = {
  // Combat sounds
  attack_hit: 'attack_hit',
  attack_miss: 'attack_miss',
  attack_critical: 'attack_critical',
  spell_cast: 'spell_cast',
  spell_fire: 'spell_fire',
  spell_ice: 'spell_ice',
  spell_lightning: 'spell_lightning',
  spell_heal: 'spell_heal',
  spell_dark: 'spell_dark',
  monster_hit: 'monster_hit',
  monster_death: 'monster_death',
  player_hit: 'player_hit',
  player_death: 'player_death',
  
  // UI sounds
  menu_open: 'menu_open',
  menu_close: 'menu_close',
  menu_select: 'menu_select',
  menu_confirm: 'menu_confirm',
  menu_cancel: 'menu_cancel',
  
  // Game sounds
  level_up: 'level_up',
  gold_pickup: 'gold_pickup',
  item_pickup: 'item_pickup',
  item_equip: 'item_equip',
  quest_complete: 'quest_complete',
  encounter_start: 'encounter_start',
  victory: 'victory',
  defeat: 'defeat',
  
  // Ambient
  footstep: 'footstep',
  door_open: 'door_open',
  chest_open: 'chest_open',
} as const;

type SoundEffect = keyof typeof SOUND_EFFECTS;

class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Record<SoundCategory, GainNode | null> = {
    music: null,
    sfx: null,
    ambient: null,
    ui: null,
  };
  private state: AudioState = {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    ambientVolume: 0.4,
    uiVolume: 0.6,
    muted: false,
  };
  private currentMusic: AudioBufferSourceNode | null = null;
  private initialized = false;

  constructor() {
    // Load saved settings
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('dndgo_audio_settings');
      if (saved) {
        this.state = { ...this.state, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('dndgo_audio_settings', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.state.muted ? 0 : this.state.masterVolume;
      
      // Create category gains
      for (const category of Object.keys(this.categoryGains) as SoundCategory[]) {
        const gain = this.audioContext.createGain();
        gain.connect(this.masterGain);
        gain.gain.value = this.state[`${category}Volume` as keyof AudioState] as number;
        this.categoryGains[category] = gain;
      }
      
      this.initialized = true;
      console.log('Audio system initialized');
    } catch (e) {
      console.warn('Failed to initialize audio system:', e);
    }
  }

  // Resume audio context (needed after user interaction)
  async resume() {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Play a synthesized sound effect (retro 8-bit style)
  playSFX(effect: SoundEffect) {
    if (!this.initialized || !this.audioContext || this.state.muted) {
      return;
    }

    this.resume();

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Create oscillator for retro sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.categoryGains.sfx || this.masterGain!);
    
    // Configure sound based on effect type
    switch (effect) {
      case 'attack_hit':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'attack_critical':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
        
      case 'attack_miss':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'spell_cast':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;
        
      case 'spell_fire':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;
        
      case 'spell_ice':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;
        
      case 'spell_lightning':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        oscillator.frequency.setValueAtTime(800, now + 0.06);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
        
      case 'spell_heal':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;
        
      case 'spell_dark':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        oscillator.start(now);
        oscillator.stop(now + 0.35);
        break;
        
      case 'monster_hit':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
        break;
        
      case 'monster_death':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
        break;
        
      case 'player_hit':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(250, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'player_death':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
        oscillator.start(now);
        oscillator.stop(now + 1);
        break;
        
      case 'menu_open':
      case 'menu_select':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.setValueAtTime(800, now + 0.05);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'menu_close':
      case 'menu_cancel':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(300, now + 0.05);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'menu_confirm':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(500, now);
        oscillator.frequency.setValueAtTime(700, now + 0.05);
        oscillator.frequency.setValueAtTime(900, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'level_up':
        this.playLevelUpSound();
        return;
        
      case 'victory':
        this.playVictorySound();
        return;
        
      case 'defeat':
        this.playDefeatSound();
        return;
        
      case 'gold_pickup':
      case 'item_pickup':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.setValueAtTime(1000, now + 0.05);
        oscillator.frequency.setValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'encounter_start':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.setValueAtTime(300, now + 0.1);
        oscillator.frequency.setValueAtTime(400, now + 0.2);
        oscillator.frequency.setValueAtTime(500, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;
        
      default:
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
  }

  // Play victory fanfare
  private playVictorySound() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.4];
    
    let time = now;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.categoryGains.sfx || this.masterGain!);
      
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
      
      osc.start(time);
      osc.stop(time + durations[i]);
      
      time += durations[i];
    });
  }

  // Play level up sound
  private playLevelUpSound() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4 to G5 arpeggio
    
    let time = now;
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.categoryGains.sfx || this.masterGain!);
      
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
      
      osc.start(time);
      osc.stop(time + 0.12);
      
      time += 0.1;
    });
  }

  // Play defeat sound
  private playDefeatSound() {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1);
    
    osc.connect(gain);
    gain.connect(this.categoryGains.sfx || this.masterGain!);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    
    osc.start(now);
    osc.stop(now + 1.2);
  }

  // Volume controls
  setMasterVolume(volume: number) {
    this.state.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && !this.state.muted) {
      this.masterGain.gain.value = this.state.masterVolume;
    }
    this.saveSettings();
  }

  setMusicVolume(volume: number) {
    this.state.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.categoryGains.music) {
      this.categoryGains.music.gain.value = this.state.musicVolume;
    }
    this.saveSettings();
  }

  setSFXVolume(volume: number) {
    this.state.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.categoryGains.sfx) {
      this.categoryGains.sfx.gain.value = this.state.sfxVolume;
    }
    this.saveSettings();
  }

  toggleMute() {
    this.state.muted = !this.state.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.state.muted ? 0 : this.state.masterVolume;
    }
    this.saveSettings();
    return this.state.muted;
  }

  isMuted() {
    return this.state.muted;
  }

  getState() {
    return { ...this.state };
  }
}

// Export singleton instance
export const audioSystem = new AudioSystem();

// React hook for audio
export function useAudio() {
  const play = (effect: SoundEffect) => {
    audioSystem.playSFX(effect);
  };

  const initialize = async () => {
    await audioSystem.initialize();
  };

  return {
    play,
    initialize,
    setMasterVolume: (v: number) => audioSystem.setMasterVolume(v),
    setMusicVolume: (v: number) => audioSystem.setMusicVolume(v),
    setSFXVolume: (v: number) => audioSystem.setSFXVolume(v),
    toggleMute: () => audioSystem.toggleMute(),
    isMuted: () => audioSystem.isMuted(),
    getState: () => audioSystem.getState(),
  };
}

export type { SoundEffect };
