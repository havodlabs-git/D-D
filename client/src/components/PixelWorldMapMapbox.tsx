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

// ===== DETERMINISTIC POI GENERATION =====
// Each tile has a fixed seed based on its absolute coordinates, so POIs never move
function generatePOIForTile(tileLat: number, tileLng: number): POI | null {
  // Absolute seed from tile coordinates - always the same for the same tile
  const tileRow = Math.round(tileLat / GRID_SIZE);
  const tileCol = Math.round(tileLng / GRID_SIZE);
  const tileSeed = tileRow * 73856093 ^ tileCol * 19349663; // hash-like seed
  const rng = seededRandom(Math.abs(tileSeed));
  
  const spawnRoll = rng();
  const typeRoll = rng();
  const nameRoll = rng();
  const tierRoll = rng();
  const offsetXRoll = rng();
  const offsetYRoll = rng();
  
  // Fixed 15% spawn density
  if (spawnRoll >= 0.15) return null;
  
  {
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
    
    return {
      id: `poi-${tileRow}-${tileCol}`,
      type,
      name,
      latitude: tileLat + GRID_SIZE / 2 + offsetLat,
      longitude: tileLng + GRID_SIZE / 2 + offsetLng,
      tier,
      spriteKey,
    };
  }
  return null;
}

// Generate all POIs for the visible area around a center point
// Uses a Map to accumulate POIs so they never disappear
function generatePOIsForArea(centerLat: number, centerLng: number, existingPOIs: Map<string, POI>, visitedSet: Set<string>): Map<string, POI> {
  const result = new Map(existingPOIs);
  const snappedLat = snapToGrid(centerLat);
  const snappedLng = snapToGrid(centerLng);
  
  for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
    for (let j = -VISIBLE_TILES; j <= VISIBLE_TILES; j++) {
      const tileLat = snappedLat + i * GRID_SIZE;
      const tileLng = snappedLng + j * GRID_SIZE;
      const tileRow = Math.round(tileLat / GRID_SIZE);
      const tileCol = Math.round(tileLng / GRID_SIZE);
      const tileKey = `poi-${tileRow}-${tileCol}`;
      
      // Skip if already generated or visited
      if (result.has(tileKey) || visitedSet.has(tileKey)) continue;
      
      const poi = generatePOIForTile(tileLat, tileLng);
      if (poi) {
        result.set(tileKey, poi);
      }
    }
  }
  
  return result;
}

// Convert POIs to GeoJSON with optional animation offsets for monsters
function poisToGeoJSON(
  pois: POI[], 
  monsterOffsets?: Map<string, { dx: number; dy: number }>
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pois.map(poi => {
      let lng = poi.longitude;
      let lat = poi.latitude;
      
      // Apply monster movement offset
      if (poi.type === "monster" && monsterOffsets?.has(poi.id)) {
        const offset = monsterOffsets.get(poi.id)!;
        lng += offset.dx;
        lat += offset.dy;
      }
      
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [lng, lat],
        },
        properties: {
          id: poi.id,
          type: poi.type,
          name: poi.name,
          tier: poi.tier || "common",
          spriteKey: poi.spriteKey || "poi-quest",
          tierColor: poi.tier ? TIER_COLORS[poi.tier] : "#00ff00",
        },
      };
    }),
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

  // Accumulated POIs map - persists across moves
  const allPOIsMapRef = useRef<Map<string, POI>>(new Map());
  const visitedPOIsRef = useRef(stableVisitedPOIs);
  visitedPOIsRef.current = stableVisitedPOIs;
  
  // Monster animation state
  const monsterAnimRef = useRef<number | null>(null);
  const monsterOffsetsRef = useRef<Map<string, { dx: number; dy: number; speed: number; angle: number; baseCoords: [number, number] }>>(new Map());
  const onlinePlayerMarkersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  
  // Generate POIs when player position changes - ACCUMULATE, don't replace
  useEffect(() => {
    if (playerGridPosition) {
      const updated = generatePOIsForArea(
        playerGridPosition.lat,
        playerGridPosition.lng,
        allPOIsMapRef.current,
        visitedPOIsRef.current
      );
      allPOIsMapRef.current = updated;
      
      // Remove visited POIs
      for (const id of visitedPOIsRef.current) {
        updated.delete(id);
      }
      
      setPOIs(Array.from(updated.values()));
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

      // Sprite icon layer - uses loaded images (no background, transparent sprites only)
      map.addLayer({
        id: "pois-icon-layer",
        type: "symbol",
        source: "pois-source",
        layout: {
          "icon-image": ["get", "spriteKey"],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            14, 0.45,
            16, 0.75,
            18, 1.0,
            20, 1.3,
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

      // Cursor changes
      const setCursorPointer = () => { map.getCanvas().style.cursor = "pointer"; };
      const setCursorDefault = () => { map.getCanvas().style.cursor = ""; };
      
      map.on("mouseenter", "pois-icon-layer", setCursorPointer);
      map.on("mouseleave", "pois-icon-layer", setCursorDefault);

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
      if (monsterAnimRef.current) {
        cancelAnimationFrame(monsterAnimRef.current);
        monsterAnimRef.current = null;
      }
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

  // Update POI GeoJSON source when pois change + start monster animation
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.loaded()) return;

    const source = mapRef.current.getSource("pois-source") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(poisToGeoJSON(pois));
      console.log("[Map] Updated POI source with", pois.length, "POIs");
    }
    
    // Initialize monster movement offsets for new monsters
    const offsets = monsterOffsetsRef.current;
    pois.forEach(poi => {
      if (poi.type === "monster" && !offsets.has(poi.id)) {
        // Each monster gets a unique random walk pattern
        const rng = seededRandom(Math.abs(poi.id.split('-').reduce((a, b) => a + parseInt(b) || 0, 0) * 31337));
        offsets.set(poi.id, {
          dx: 0,
          dy: 0,
          speed: 0.000008 + rng() * 0.000015, // Visible slow movement
          angle: rng() * Math.PI * 2, // Random initial direction
          targetAngle: rng() * Math.PI * 2, // Target direction for smooth turning
          turnTimer: 0, // Timer for direction changes
          turnInterval: 120 + rng() * 300, // Frames between direction changes
          pauseTimer: 0, // Timer for idle pauses
          isPaused: false, // Whether monster is currently paused
          baseCoords: [poi.longitude, poi.latitude],
        });
      }
    });
  }, [pois]);
  
  // Monster roaming animation loop
  useEffect(() => {
    if (!mapRef.current) return;
    
    const WANDER_RADIUS = GRID_SIZE * 3.0; // Generous wander radius for visible movement
    const SMOOTH_TURN = 0.04; // Smooth turning interpolation
    let lastTime = performance.now();
    let frameCount = 0;
    
    const animate = (time: number) => {
      const delta = (time - lastTime) / 16.67; // Normalize to ~60fps
      lastTime = time;
      frameCount++;
      
      const map = mapRef.current;
      if (!map || !map.loaded()) {
        monsterAnimRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const source = map.getSource("pois-source") as mapboxgl.GeoJSONSource;
      if (!source) {
        monsterAnimRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const offsets = monsterOffsetsRef.current;
      let hasMonsters = false;
      
      offsets.forEach((state: any) => {
        hasMonsters = true;
        
        // Handle pause behavior (monsters stop occasionally)
        if (state.isPaused) {
          state.pauseTimer -= delta;
          if (state.pauseTimer <= 0) {
            state.isPaused = false;
            state.targetAngle = Math.random() * Math.PI * 2;
          }
          return; // Don't move while paused
        }
        
        // Periodically pick a new target direction
        state.turnTimer += delta;
        if (state.turnTimer >= state.turnInterval) {
          state.turnTimer = 0;
          state.turnInterval = 120 + Math.random() * 300;
          state.targetAngle = Math.random() * Math.PI * 2;
          
          // Occasionally pause (20% chance)
          if (Math.random() < 0.2) {
            state.isPaused = true;
            state.pauseTimer = 60 + Math.random() * 180; // Pause 1-4 seconds
            return;
          }
        }
        
        // Smoothly interpolate angle toward target (smooth turning)
        let angleDiff = state.targetAngle - state.angle;
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        state.angle += angleDiff * SMOOTH_TURN * delta;
        
        // Move in current direction
        state.dx += Math.cos(state.angle) * state.speed * delta;
        state.dy += Math.sin(state.angle) * state.speed * delta;
        
        // Keep within wander radius (soft boundary with smooth return)
        const dist = Math.sqrt(state.dx * state.dx + state.dy * state.dy);
        if (dist > WANDER_RADIUS) {
          // Smoothly steer back toward base
          const returnAngle = Math.atan2(-state.dy, -state.dx);
          state.targetAngle = returnAngle + (Math.random() - 0.5) * 0.8;
          state.dx *= 0.995;
          state.dy *= 0.995;
        }
      });
      
      // Update GeoJSON source every 2 frames for smooth but performant animation
      if (hasMonsters && frameCount % 2 === 0) {
        const currentPOIs = poisRef.current;
        source.setData(poisToGeoJSON(currentPOIs, offsets));
      }
      
      monsterAnimRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation after a short delay to let map settle
    const startTimer = setTimeout(() => {
      monsterAnimRef.current = requestAnimationFrame(animate);
    }, 2000);
    
    return () => {
      clearTimeout(startTimer);
      if (monsterAnimRef.current) {
        cancelAnimationFrame(monsterAnimRef.current);
        monsterAnimRef.current = null;
      }
    };
  }, []);

  // Render online players as markers on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMarkers = onlinePlayerMarkersRef.current;
    const currentPlayerIds = new Set<number>();

    // Add or update markers for each online player
    (stableOnlinePlayers || []).forEach((player) => {
      if (!player.latitude || !player.longitude) return;
      currentPlayerIds.add(player.id);

      if (currentMarkers.has(player.id)) {
        // Update existing marker position
        currentMarkers.get(player.id)!.setLngLat([player.longitude, player.latitude]);
      } else {
        // Create new marker element
        const container = document.createElement("div");
        container.style.cssText = `
          width: 52px;
          height: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 500;
          pointer-events: auto;
          cursor: pointer;
        `;

        const sprite = document.createElement("img");
        sprite.src = CLASS_SPRITES[player.characterClass] || CLASS_SPRITES.fighter;
        sprite.style.cssText = `
          width: 40px;
          height: 40px;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          border: 2px solid #4488ff;
          border-radius: 50%;
          background: rgba(0,0,40,0.7);
          padding: 2px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
        `;
        sprite.alt = player.characterName;
        sprite.onerror = () => {
          sprite.style.display = "none";
          const fallback = document.createElement("div");
          fallback.textContent = "\u2694";
          fallback.style.cssText = "font-size: 24px; text-align: center;";
          container.insertBefore(fallback, nameTag);
        };

        const nameTag = document.createElement("div");
        nameTag.textContent = `${player.characterName} Lv${player.characterLevel}`;
        nameTag.style.cssText = `
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #ffffff;
          background: rgba(0,0,40,0.85);
          border: 1px solid #4488ff;
          border-radius: 2px;
          padding: 1px 4px;
          white-space: nowrap;
          text-shadow: 1px 1px 0 #000;
          margin-top: 2px;
        `;

        // Status indicator dot
        const statusDot = document.createElement("div");
        const statusColor = player.status === "combat" ? "#ff4444" : player.status === "shop" ? "#ffaa00" : "#44ff44";
        statusDot.style.cssText = `
          position: absolute;
          top: 0;
          right: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${statusColor};
          border: 1px solid #000;
          box-shadow: 0 0 4px ${statusColor};
        `;

        container.appendChild(sprite);
        container.appendChild(nameTag);
        container.appendChild(statusDot);

        // Tooltip on click
        container.addEventListener("click", () => {
          const classNames: Record<string, string> = {
            fighter: "Guerreiro", wizard: "Mago", rogue: "Ladino", cleric: "Cl\u00e9rigo",
            ranger: "Patrulheiro", paladin: "Paladino", barbarian: "B\u00e1rbaro", bard: "Bardo",
            druid: "Druida", monk: "Monge", sorcerer: "Feiticeiro", warlock: "Bruxo",
          };
          const statusNames: Record<string, string> = {
            exploring: "Explorando", combat: "Em Combate", dungeon: "Na Dungeon",
            shop: "Na Loja", idle: "Parado",
          };
          new mapboxgl.Popup({ closeOnClick: true, maxWidth: "200px" })
            .setLngLat([player.longitude!, player.latitude!])
            .setHTML(`
              <div style="font-family:'Press Start 2P',monospace;font-size:8px;padding:4px;background:#1a1a2e;color:#e2c87e;border:1px solid #c8a84e;">
                <div style="font-size:10px;color:#FFD700;margin-bottom:4px;">${player.characterName}</div>
                <div>Nv. ${player.characterLevel} ${classNames[player.characterClass] || player.characterClass}</div>
                <div style="color:#9CA3AF;margin-top:2px;">${statusNames[player.status] || player.status}</div>
              </div>
            `)
            .addTo(map);
        });

        const marker = new mapboxgl.Marker({ element: container })
          .setLngLat([player.longitude, player.latitude])
          .addTo(map);

        currentMarkers.set(player.id, marker);
      }
    });

    // Remove markers for players that are no longer online
    currentMarkers.forEach((marker, id) => {
      if (!currentPlayerIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });
  }, [stableOnlinePlayers]);

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
