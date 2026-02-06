import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Set the Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZG92YWgyMiIsImEiOiJjbWw5c21yZ2owNWV5M2NzOTV5OWg3b2hyIn0.VeYToWXxh4eaf4ZTH1D13w";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest" | "guild" | "castle" | "city" | "tavern" | "temple" | "blacksmith" | "magic_shop";
  name: string;
  latitude: number;
  longitude: number;
  biome?: string;
  data?: any;
  tier?: "common" | "elite" | "boss" | "legendary";
  spriteKey?: string; // key for the specific sprite to use
}

interface OnlinePlayer {
  id: number;
  characterName: string;
  characterClass: string;
  characterLevel: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

interface PixelWorldMapProps {
  onPOIClick: (poi: POI) => void;
  onPlayerMove?: (lat: number, lng: number) => void;
  onRandomEncounter?: (encounter: any) => void;
  onPOIRemove?: (poiId: string) => void;
  visitedPOIs?: Set<string>;
  className?: string;
  characterClass?: string;
  onlinePlayers?: OnlinePlayer[];
}

// Grid configuration
const GRID_SIZE = 0.0001;
const VISIBLE_TILES = 30;

// ===== SPRITE ICON MAPPING =====
// Each POI type maps to specific sprite images to load into Mapbox
const POI_SPRITE_MAP: Record<string, string> = {
  // Monsters - each monster type has its own sprite
  "monster-goblin": "/sprites/monsters/goblin.png",
  "monster-goblin_archer": "/sprites/monsters/goblin_archer.png",
  "monster-goblin_boss": "/sprites/monsters/goblin_boss.png",
  "monster-goblin_shaman": "/sprites/monsters/goblin_shaman.png",
  "monster-orc": "/sprites/monsters/orc.png",
  "monster-skeleton": "/sprites/monsters/skeleton.png",
  "monster-skeleton_warrior": "/sprites/monsters/skeleton_warrior.png",
  "monster-wolf": "/sprites/monsters/wolf.png",
  "monster-wolf_dire": "/sprites/monsters/wolf_dire.png",
  "monster-bandit": "/sprites/monsters/bandit.png",
  "monster-kobold": "/sprites/monsters/kobold.png",
  "monster-rat_giant": "/sprites/monsters/rat_giant.png",
  "monster-rat_sewer": "/sprites/monsters/rat_sewer.png",
  "monster-zombie": "/sprites/monsters/zombie.png",
  "monster-spider_giant": "/sprites/monsters/spider_giant.png",
  "monster-bat_giant": "/sprites/monsters/bat_giant.png",
  "monster-slime": "/sprites/monsters/slime.png",
  "monster-troll": "/sprites/monsters/troll.png",
  "monster-ogre": "/sprites/monsters/ogre.png",
  "monster-ghoul": "/sprites/monsters/ghoul.png",
  "monster-imp": "/sprites/monsters/imp.png",
  "monster-harpy": "/sprites/monsters/harpy.png",
  "monster-mimic": "/sprites/monsters/mimic.png",
  "monster-dragon": "/sprites/monsters/dragon.png",
  "monster-gelatinous_cube": "/sprites/monsters/gelatinous_cube.png",
  "monster-rat_king": "/sprites/monsters/rat_king.png",
  // NPCs
  "npc-merchant": "/sprites/npcs/merchant.png",
  "npc-blacksmith": "/sprites/npcs/blacksmith.png",
  "npc-alchemist": "/sprites/npcs/alchemist.png",
  "npc-innkeeper": "/sprites/npcs/innkeeper.png",
  // Buildings / POI types
  "poi-shop": "/sprites/npcs/merchant.png",
  "poi-treasure": "/sprites/ui/marker-treasure.png",
  "poi-dungeon": "/sprites/tiles/dungeon.png",
  "poi-guild": "/sprites/items/sword.png",
  "poi-castle": "/sprites/buildings/castle.png",
  "poi-city": "/sprites/buildings/tower.png",
  "poi-tavern": "/sprites/npcs/innkeeper.png",
  "poi-temple": "/sprites/ui/heart.png",
  "poi-blacksmith": "/sprites/npcs/blacksmith.png",
  "poi-magic_shop": "/sprites/ui/mana.png",
  "poi-quest": "/sprites/ui/d20.png",
};

// Monster names mapped to sprite keys
const MONSTER_SPRITES: { name: string; spriteKey: string; tier?: POI["tier"] }[] = [
  // Common monsters (Tier 1)
  { name: "Rato de Esgoto", spriteKey: "monster-rat_sewer" },
  { name: "Rato Gigante", spriteKey: "monster-rat_giant" },
  { name: "Slime", spriteKey: "monster-slime" },
  { name: "Kobold", spriteKey: "monster-kobold" },
  { name: "Goblin", spriteKey: "monster-goblin" },
  { name: "Goblin Arqueiro", spriteKey: "monster-goblin_archer" },
  { name: "Morcego Gigante", spriteKey: "monster-bat_giant" },
  { name: "Lobo Selvagem", spriteKey: "monster-wolf" },
  { name: "Bandido", spriteKey: "monster-bandit" },
  { name: "Esqueleto", spriteKey: "monster-skeleton" },
  { name: "Zumbi", spriteKey: "monster-zombie" },
  { name: "Imp", spriteKey: "monster-imp" },
  // Elite monsters (Tier 2)
  { name: "Orc Guerreiro", spriteKey: "monster-orc", tier: "elite" },
  { name: "Aranha Gigante", spriteKey: "monster-spider_giant", tier: "elite" },
  { name: "Ghoul", spriteKey: "monster-ghoul", tier: "elite" },
  { name: "Esqueleto Guerreiro", spriteKey: "monster-skeleton_warrior", tier: "elite" },
  { name: "Lobo Atroz", spriteKey: "monster-wolf_dire", tier: "elite" },
  { name: "Harpia", spriteKey: "monster-harpy", tier: "elite" },
  { name: "Cubo Gelatinoso", spriteKey: "monster-gelatinous_cube", tier: "elite" },
  { name: "Goblin Xamã", spriteKey: "monster-goblin_shaman", tier: "elite" },
  // Boss monsters (Tier 3)
  { name: "Troll", spriteKey: "monster-troll", tier: "boss" },
  { name: "Ogre", spriteKey: "monster-ogre", tier: "boss" },
  { name: "Goblin Chefe", spriteKey: "monster-goblin_boss", tier: "boss" },
  { name: "Rei dos Ratos", spriteKey: "monster-rat_king", tier: "boss" },
  { name: "Mímico", spriteKey: "monster-mimic", tier: "boss" },
  // Legendary (Tier 4)
  { name: "Dragão Vermelho", spriteKey: "monster-dragon", tier: "legendary" },
];

const NPC_NAMES = [
  { name: "Viajante", spriteKey: "npc-merchant" },
  { name: "Guarda", spriteKey: "npc-blacksmith" },
  { name: "Camponês", spriteKey: "npc-innkeeper" },
  { name: "Aventureiro", spriteKey: "npc-merchant" },
  { name: "Sábio", spriteKey: "npc-alchemist" },
  { name: "Bardo Errante", spriteKey: "npc-innkeeper" },
  { name: "Mercador Ambulante", spriteKey: "npc-merchant" },
];

const SHOP_NAMES = ["Loja do Ferreiro", "Empório Mágico", "Boticário", "Armeiro", "Joalheiro", "Loja de Armas", "Pergaminhos & Poções"];
const TREASURE_NAMES = ["Baú Misterioso", "Tesouro Escondido", "Relíquia Antiga", "Cofre Abandonado", "Arca Dourada"];
const DUNGEON_NAMES = ["Caverna Sombria", "Cripta Antiga", "Torre Abandonada", "Ruínas Antigas", "Mina Perdida", "Catacumbas", "Labirinto Subterrâneo"];
const QUEST_NAMES = ["Pedido de Ajuda", "Missão Urgente", "Contrato de Caça", "Investigação", "Resgate"];
const GUILD_NAMES = ["Guilda dos Aventureiros", "Ordem dos Cavaleiros", "Liga dos Mercenários"];
const CASTLE_NAMES = ["Castelo do Barão", "Fortaleza Antiga", "Torre do Senhor", "Cidadela", "Castelo Assombrado"];
const CITY_NAMES = ["Waterdeep", "Baldur's Gate", "Neverwinter", "Silverymoon", "Luskan", "Phandalin"];
const TAVERN_NAMES = ["Taverna do Dragão Dourado", "Estalagem do Viajante", "O Porco Preguiçoso", "A Caneca Cheia"];
const TEMPLE_NAMES = ["Templo de Pelor", "Santuário de Tyr", "Capela de Lathander", "Templo de Mystra"];
const BLACKSMITH_NAMES = ["Forja do Mestre", "Ferreiro Anão", "Armeiro Real", "Forja das Lendas"];
const MAGIC_SHOP_NAMES = ["Empório Arcano", "Loja do Mago", "Pergaminhos & Poções", "Artefatos Místicos"];

const TIER_COLORS: Record<string, string> = {
  common: "#9ca3af", elite: "#3b82f6", boss: "#a855f7", legendary: "#f59e0b",
};

const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/druid.png",
  monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png",
  warlock: "/sprites/classes/warlock.png",
};

function snapToGrid(coord: number): number {
  return Math.floor(coord / GRID_SIZE) * GRID_SIZE;
}

function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// ===== IMPROVED POI GENERATION =====
function generatePOIsForGrid(centerLat: number, centerLng: number): POI[] {
  const pois: POI[] = [];
  const baseSeed = Math.floor(centerLat * 10000) + Math.floor(centerLng * 10000);
  
  for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
    for (let j = -VISIBLE_TILES; j <= VISIBLE_TILES; j++) {
      const tileLat = snapToGrid(centerLat) + i * GRID_SIZE;
      const tileLng = snapToGrid(centerLng) + j * GRID_SIZE;
      const tileSeed = baseSeed + i * 1000 + j;
      const rng = seededRandom(tileSeed);
      
      // Use multiple rng calls for better distribution
      const spawnRoll = rng();
      const typeRoll = rng();
      const nameRoll = rng();
      const tierRoll = rng();
      const offsetXRoll = rng();
      const offsetYRoll = rng();
      
      // Variable spawn density: 12% base, creates natural clusters
      const distFromCenter = Math.sqrt(i * i + j * j);
      const densityMod = distFromCenter < 10 ? 0.18 : distFromCenter < 20 ? 0.14 : 0.10;
      
      if (spawnRoll < densityMod) {
        let type: POI["type"];
        let name: string;
        let tier: POI["tier"] = undefined;
        let spriteKey: string;
        
        // Better type distribution - monsters are most common
        if (typeRoll < 0.35) {
          type = "monster";
          // Pick monster based on tier probability
          let monsterPool: typeof MONSTER_SPRITES;
          if (tierRoll > 0.97) {
            monsterPool = MONSTER_SPRITES.filter(m => m.tier === "legendary");
            tier = "legendary";
          } else if (tierRoll > 0.88) {
            monsterPool = MONSTER_SPRITES.filter(m => m.tier === "boss");
            tier = "boss";
          } else if (tierRoll > 0.65) {
            monsterPool = MONSTER_SPRITES.filter(m => m.tier === "elite");
            tier = "elite";
          } else {
            monsterPool = MONSTER_SPRITES.filter(m => !m.tier);
            tier = "common";
          }
          const monster = monsterPool[Math.floor(nameRoll * monsterPool.length)];
          name = monster.name;
          spriteKey = monster.spriteKey;
          if (monster.tier) tier = monster.tier;
        } else if (typeRoll < 0.45) {
          type = "treasure";
          name = TREASURE_NAMES[Math.floor(nameRoll * TREASURE_NAMES.length)];
          spriteKey = "poi-treasure";
        } else if (typeRoll < 0.53) {
          type = "shop";
          name = SHOP_NAMES[Math.floor(nameRoll * SHOP_NAMES.length)];
          spriteKey = "poi-shop";
        } else if (typeRoll < 0.60) {
          type = "npc";
          const npc = NPC_NAMES[Math.floor(nameRoll * NPC_NAMES.length)];
          name = npc.name;
          spriteKey = npc.spriteKey;
        } else if (typeRoll < 0.67) {
          type = "dungeon";
          name = DUNGEON_NAMES[Math.floor(nameRoll * DUNGEON_NAMES.length)];
          spriteKey = "poi-dungeon";
          tier = tierRoll > 0.85 ? "boss" : tierRoll > 0.6 ? "elite" : "common";
        } else if (typeRoll < 0.72) {
          type = "guild";
          name = GUILD_NAMES[Math.floor(nameRoll * GUILD_NAMES.length)];
          spriteKey = "poi-guild";
        } else if (typeRoll < 0.77) {
          type = "castle";
          name = CASTLE_NAMES[Math.floor(nameRoll * CASTLE_NAMES.length)];
          spriteKey = "poi-castle";
          tier = tierRoll > 0.8 ? "boss" : tierRoll > 0.5 ? "elite" : "common";
        } else if (typeRoll < 0.82) {
          type = "tavern";
          name = TAVERN_NAMES[Math.floor(nameRoll * TAVERN_NAMES.length)];
          spriteKey = "poi-tavern";
        } else if (typeRoll < 0.86) {
          type = "temple";
          name = TEMPLE_NAMES[Math.floor(nameRoll * TEMPLE_NAMES.length)];
          spriteKey = "poi-temple";
        } else if (typeRoll < 0.90) {
          type = "blacksmith";
          name = BLACKSMITH_NAMES[Math.floor(nameRoll * BLACKSMITH_NAMES.length)];
          spriteKey = "poi-blacksmith";
        } else if (typeRoll < 0.94) {
          type = "magic_shop";
          name = MAGIC_SHOP_NAMES[Math.floor(nameRoll * MAGIC_SHOP_NAMES.length)];
          spriteKey = "poi-magic_shop";
        } else if (typeRoll < 0.97) {
          type = "city";
          name = CITY_NAMES[Math.floor(nameRoll * CITY_NAMES.length)];
          spriteKey = "poi-city";
        } else {
          type = "quest";
          name = QUEST_NAMES[Math.floor(nameRoll * QUEST_NAMES.length)];
          spriteKey = "poi-quest";
        }
        
        // Add slight random offset within the tile for more natural placement
        const offsetLat = (offsetXRoll - 0.5) * GRID_SIZE * 0.6;
        const offsetLng = (offsetYRoll - 0.5) * GRID_SIZE * 0.6;
        
        pois.push({
          id: `poi-${tileLat.toFixed(6)}-${tileLng.toFixed(6)}`,
          type,
          name,
          latitude: tileLat + GRID_SIZE / 2 + offsetLat,
          longitude: tileLng + GRID_SIZE / 2 + offsetLng,
          tier,
          spriteKey,
        });
      }
    }
  }
  
  return pois;
}

// Convert POIs to GeoJSON FeatureCollection
function poisToGeoJSON(pois: POI[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pois.map(poi => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [poi.longitude, poi.latitude],
      },
      properties: {
        id: poi.id,
        type: poi.type,
        name: poi.name,
        tier: poi.tier || "common",
        spriteKey: poi.spriteKey || "poi-quest",
        tierColor: poi.tier ? TIER_COLORS[poi.tier] : "#00ff00",
      },
    })),
  };
}

// Stable empty defaults to avoid re-render loops
const EMPTY_SET = new Set<string>();
const EMPTY_PLAYERS: OnlinePlayer[] = [];

// Load all sprite images into Mapbox map
async function loadAllSprites(map: mapboxgl.Map): Promise<void> {
  const entries = Object.entries(POI_SPRITE_MAP);
  const ICON_SIZE = 64; // Size for map icons
  
  // Create a canvas for resizing
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;
  
  const loadPromises = entries.map(([key, url]) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Draw resized image to canvas
        ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
        
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
        
        // Add to map
        if (!map.hasImage(key)) {
          map.addImage(key, imageData, { pixelRatio: 2 });
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`[Map] Failed to load sprite: ${key} from ${url}`);
        resolve(); // Don't block on failed images
      };
      img.src = url;
    });
  });
  
  await Promise.all(loadPromises);
  console.log(`[Map] Loaded ${entries.length} sprite icons`);
}

export default function PixelWorldMap({ 
  onPOIClick, 
  onPlayerMove,
  onRandomEncounter,
  visitedPOIs,
  className, 
  characterClass = "fighter",
  onlinePlayers
}: PixelWorldMapProps) {
  // Use stable defaults to prevent re-render loops
  const stableVisitedPOIs = visitedPOIs || EMPTY_SET;
  const stableOnlinePlayers = onlinePlayers || EMPTY_PLAYERS;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const playerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const initialized = useRef(false);
  const poisRef = useRef<POI[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [playerGridPosition, setPlayerGridPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [poiCount, setPOICount] = useState(0);

  const moveCharacter = trpc.character.move.useMutation();
  const { data: movementStatus, refetch: refetchMovement } = trpc.character.getMovementStatus.useQuery();

  // Keep poisRef in sync
  useEffect(() => {
    poisRef.current = pois;
    setPOICount(pois.length);
  }, [pois]);

  // Get user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada");
      setIsLoadingLocation(false);
      const defaultLoc = { lat: 39.2369, lng: -8.6850 };
      setUserLocation(defaultLoc);
      setPlayerGridPosition({ lat: snapToGrid(defaultLoc.lat), lng: snapToGrid(defaultLoc.lng) });
      return;
    }

    const fallbackTimer = setTimeout(() => {
      console.log("Geolocation timeout, using default location (Santarém)");
      setLocationError("Usando localização padrão (Santarém)");
      setIsLoadingLocation(false);
      const defaultLoc = { lat: 39.2369, lng: -8.6850 };
      setUserLocation(defaultLoc);
      setPlayerGridPosition({ lat: snapToGrid(defaultLoc.lat), lng: snapToGrid(defaultLoc.lng) });
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(fallbackTimer);
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        setPlayerGridPosition({ 
          lat: snapToGrid(newLocation.lat), 
          lng: snapToGrid(newLocation.lng) 
        });
        setIsLoadingLocation(false);
        setLocationError(null);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        console.error("Geolocation error:", error);
        setLocationError("Usando localização padrão (Santarém)");
        setIsLoadingLocation(false);
        const defaultLoc = { lat: 39.2369, lng: -8.6850 };
        setUserLocation(defaultLoc);
        setPlayerGridPosition({ lat: snapToGrid(defaultLoc.lat), lng: snapToGrid(defaultLoc.lng) });
      },
    );
  }, []);

  // Generate POIs when player position changes
  const visitedPOIsRef = useRef(stableVisitedPOIs);
  visitedPOIsRef.current = stableVisitedPOIs;
  
  useEffect(() => {
    if (playerGridPosition) {
      const newPOIs = generatePOIsForGrid(playerGridPosition.lat, playerGridPosition.lng)
        .filter(poi => !visitedPOIsRef.current.has(poi.id));
      setPOIs(newPOIs);
    }
  }, [playerGridPosition]);

  // Create player marker element
  const createPlayerMarkerElement = useCallback((): HTMLElement => {
    const container = document.createElement("div");
    container.style.cssText = `
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));
      z-index: 1000;
      pointer-events: none;
    `;
    
    const sprite = document.createElement("img");
    sprite.src = CLASS_SPRITES[characterClass] || CLASS_SPRITES.fighter;
    sprite.style.cssText = `
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      border: 3px solid #00ff00;
      border-radius: 50%;
      background: rgba(0,0,0,0.6);
      padding: 2px;
    `;
    sprite.alt = "Player";
    sprite.onerror = () => {
      sprite.style.display = "none";
      container.innerHTML = "🧙";
      container.style.fontSize = "36px";
    };
    
    container.appendChild(sprite);
    return container;
  }, [characterClass]);

  // Move player - NO distance limit
  const movePlayerTo = useCallback((targetLat: number, targetLng: number) => {
    if (!playerGridPosition || isMoving) return;
    
    const snappedLat = snapToGrid(targetLat);
    const snappedLng = snapToGrid(targetLng);
    
    if (snappedLat === playerGridPosition.lat && snappedLng === playerGridPosition.lng) {
      return;
    }
    
    setIsMoving(true);
    
    const newPosition = { lat: snappedLat, lng: snappedLng };
    setPlayerGridPosition(newPosition);
    
    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLngLat([newPosition.lng, newPosition.lat]);
    }
    
    moveCharacter.mutate({
      latitude: newPosition.lat,
      longitude: newPosition.lng,
    }, {
      onSuccess: (result) => {
        refetchMovement();
        
        if (result.encounter && onRandomEncounter) {
          onRandomEncounter(result.encounter);
        }
        
        if (onPlayerMove) {
          onPlayerMove(newPosition.lat, newPosition.lng);
        }
      },
      onError: (error) => {
        console.warn("Move error:", error.message);
      },
    });
    
    if (mapRef.current) {
      mapRef.current.panTo([newPosition.lng, newPosition.lat]);
    }
    
    setTimeout(() => setIsMoving(false), 300);
  }, [playerGridPosition, isMoving, moveCharacter, onPlayerMove, onRandomEncounter, refetchMovement]);

  // Handle keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerGridPosition || isMoving) return;
      
      let dLat = 0, dLng = 0;
      
      switch (e.key) {
        case "ArrowUp": case "w": case "W": dLat = 1; break;
        case "ArrowDown": case "s": case "S": dLat = -1; break;
        case "ArrowLeft": case "a": case "A": dLng = -1; break;
        case "ArrowRight": case "d": case "D": dLng = 1; break;
        default: return;
      }
      
      e.preventDefault();
      
      const newLat = playerGridPosition.lat + dLat * GRID_SIZE;
      const newLng = playerGridPosition.lng + dLng * GRID_SIZE;
      
      movePlayerTo(newLat, newLng);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerGridPosition, isMoving, movePlayerTo]);

  // Initialize Mapbox map with sprite-based POI icons
  useEffect(() => {
    if (initialized.current || !mapContainer.current || !userLocation) return;
    initialized.current = true;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [userLocation.lng, userLocation.lat],
      zoom: 17,
      pitch: 0,
      bearing: 0,
      antialias: true,
      fadeDuration: 0,
    });

    mapRef.current = map;
    (window as any)._mapboxMap = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    map.addControl(new mapboxgl.ScaleControl(), "bottom-right");

    map.on("load", async () => {
      console.log("[Map] Map loaded, loading sprite icons...");
      
      // Load all sprite images into Mapbox
      await loadAllSprites(map);
      
      // Create player marker
      if (playerGridPosition) {
        playerMarkerRef.current = new mapboxgl.Marker({
          element: createPlayerMarkerElement(),
          anchor: "center",
        })
          .setLngLat([playerGridPosition.lng, playerGridPosition.lat])
          .addTo(map);
        console.log("[Map] Player marker created at", playerGridPosition);
      }

      // Add GeoJSON source for POIs
      const currentPOIs = poisRef.current;
      map.addSource("pois-source", {
        type: "geojson",
        data: poisToGeoJSON(currentPOIs),
      });

      // Background glow circle per tier
      map.addLayer({
        id: "pois-glow-layer",
        type: "circle",
        source: "pois-source",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            14, 10,
            16, 18,
            18, 24,
            20, 30,
          ],
          "circle-color": [
            "match", ["get", "tier"],
            "legendary", "rgba(245, 158, 11, 0.3)",
            "boss", "rgba(168, 85, 247, 0.3)",
            "elite", "rgba(59, 130, 246, 0.25)",
            "rgba(0, 0, 0, 0)"
          ],
          "circle-blur": 0.8,
        },
      });

      // Dark background circle for icon visibility
      map.addLayer({
        id: "pois-bg-layer",
        type: "circle",
        source: "pois-source",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            14, 8,
            16, 14,
            18, 20,
            20, 26,
          ],
          "circle-color": "rgba(15, 10, 25, 0.85)",
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            14, 1,
            18, 2.5,
          ],
          "circle-stroke-color": [
            "match", ["get", "tier"],
            "legendary", "#f59e0b",
            "boss", "#a855f7",
            "elite", "#3b82f6",
            "common", "#4a5568",
            "#22c55e"
          ],
        },
      });

      // Sprite icon layer - uses loaded images
      map.addLayer({
        id: "pois-icon-layer",
        type: "symbol",
        source: "pois-source",
        layout: {
          "icon-image": ["get", "spriteKey"],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            14, 0.25,
            16, 0.45,
            18, 0.65,
            20, 0.85,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "center",
        },
      });

      // Name labels
      map.addLayer({
        id: "pois-label-layer",
        type: "symbol",
        source: "pois-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            14, 0,
            16, 8,
            18, 11,
            20, 13,
          ],
          "text-offset": [0, 2.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
        minzoom: 16,
      });

      console.log("[Map] Sprite layers created with", currentPOIs.length, "POIs");

      // Click handlers for POI icons and background
      const handlePOIClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props) {
          const clickedPOI = poisRef.current.find(p => p.id === props.id);
          if (clickedPOI) {
            e.originalEvent.stopPropagation();
            onPOIClick(clickedPOI);
          }
        }
      };

      map.on("click", "pois-icon-layer", handlePOIClick);
      map.on("click", "pois-bg-layer", handlePOIClick);

      // Cursor changes
      const setCursorPointer = () => { map.getCanvas().style.cursor = "pointer"; };
      const setCursorDefault = () => { map.getCanvas().style.cursor = ""; };
      
      map.on("mouseenter", "pois-icon-layer", setCursorPointer);
      map.on("mouseleave", "pois-icon-layer", setCursorDefault);
      map.on("mouseenter", "pois-bg-layer", setCursorPointer);
      map.on("mouseleave", "pois-bg-layer", setCursorDefault);

      // Tooltip on hover
      map.on("mousemove", "pois-icon-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props) {
          const coords = (e.features[0].geometry as any).coordinates.slice();
          
          if (popupRef.current) popupRef.current.remove();
          
          const tierBadge = props.tier && props.tier !== "common" 
            ? `<span style="color:${props.tierColor};font-weight:bold;text-transform:uppercase;font-size:10px;display:block;margin-top:2px;">${props.tier}</span>` 
            : "";
          
          popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "poi-popup",
            offset: 25,
          })
            .setLngLat(coords)
            .setHTML(`<div style="background:#0f0a19;color:#fff;padding:8px 12px;border-radius:4px;border:2px solid ${props.tierColor || '#22c55e'};font-size:12px;font-family:'Press Start 2P',monospace;image-rendering:pixelated;box-shadow:0 0 10px ${props.tierColor || '#22c55e'}40;"><strong>${props.name}</strong>${tierBadge}</div>`)
            .addTo(map);
        }
      });

      map.on("mouseleave", "pois-icon-layer", () => {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });
    });

    // Map click to move player
    map.on("click", (e) => {
      movePlayerTo(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initialized.current = false;
      }
    };
  }, [userLocation]);

  // Update player marker when position changes
  useEffect(() => {
    if (!mapRef.current || !playerGridPosition) return;

    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLngLat([playerGridPosition.lng, playerGridPosition.lat]);
    } else if (mapRef.current.loaded()) {
      playerMarkerRef.current = new mapboxgl.Marker({
        element: createPlayerMarkerElement(),
        anchor: "center",
      })
        .setLngLat([playerGridPosition.lng, playerGridPosition.lat])
        .addTo(mapRef.current);
    }
  }, [playerGridPosition, createPlayerMarkerElement]);

  // Update POI GeoJSON source when pois change
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.loaded()) return;

    const source = mapRef.current.getSource("pois-source") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(poisToGeoJSON(pois));
      console.log("[Map] Updated POI source with", pois.length, "POIs");
    }
  }, [pois]);

  // Render online players
  useEffect(() => {
    // Skip for now
  }, [onlinePlayers]);

  if (isLoadingLocation) {
    return (
      <div className={cn("flex items-center justify-center bg-card", className)}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Obtendo localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "400px" }} />
      
      {/* POI counter - pixel art style */}
      <div className="absolute top-4 left-4 z-10" style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #0f0a19 100%)",
        border: "2px solid #c8a84e",
        borderRadius: "2px",
        padding: "6px 10px",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "9px",
        color: "#e2c87e",
        boxShadow: "0 0 8px rgba(200, 168, 78, 0.3), inset 0 0 4px rgba(0,0,0,0.5)",
        imageRendering: "pixelated" as any,
      }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "12px" }}>⚔</span>
          <span>{poiCount} POIs</span>
        </div>
      </div>
      
      {/* Legend - pixel art style */}
      <div className="absolute bottom-4 left-4 z-10" style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #0f0a19 100%)",
        border: "2px solid #c8a84e",
        borderRadius: "2px",
        padding: "8px 10px",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "7px",
        color: "#d4c4a0",
        boxShadow: "0 0 8px rgba(200, 168, 78, 0.3), inset 0 0 4px rgba(0,0,0,0.5)",
        imageRendering: "pixelated" as any,
        lineHeight: "1.8",
      }}>
        <div style={{ color: "#e2c87e", marginBottom: "4px", fontSize: "8px" }}>Legenda:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span><span style={{ color: "#ef4444" }}>●</span> Monstro</span>
          <span><span style={{ color: "#22c55e" }}>●</span> Loja</span>
          <span><span style={{ color: "#eab308" }}>●</span> Tesouro</span>
          <span><span style={{ color: "#8b5cf6" }}>●</span> Dungeon</span>
          <span><span style={{ color: "#f97316" }}>●</span> Guilda</span>
          <span><span style={{ color: "#06b6d4" }}>●</span> Castelo</span>
        </div>
        <div style={{ marginTop: "6px", color: "#e2c87e", fontSize: "6px" }}>
          Clique para mover | WASD para andar
        </div>
      </div>
      
      {/* Location error */}
      {locationError && (
        <div className="absolute top-4 right-20 z-10" style={{
          background: "rgba(120, 80, 0, 0.9)",
          border: "2px solid #c8a84e",
          borderRadius: "2px",
          padding: "6px 10px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#e2c87e",
        }}>
          {locationError}
        </div>
      )}

      {/* Custom popup styles */}
      <style>{`
        .poi-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .poi-popup .mapboxgl-popup-tip {
          border-top-color: #0f0a19 !important;
        }
      `}</style>
    </div>
  );
}
