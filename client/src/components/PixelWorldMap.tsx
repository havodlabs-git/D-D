import { useCallback, useEffect, useRef, useState } from "react";
import { MapView } from "./Map";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest" | "guild" | "castle" | "city" | "tavern" | "temple" | "blacksmith" | "magic_shop";
  name: string;
  latitude: number;
  longitude: number;
  biome?: string;
  data?: any;
  tier?: "common" | "elite" | "boss" | "legendary";
}

interface PixelWorldMapProps {
  onPOIClick: (poi: POI) => void;
  onPlayerMove?: (lat: number, lng: number) => void;
  onRandomEncounter?: (encounter: any) => void;
  onPOIRemove?: (poiId: string) => void;
  visitedPOIs?: Set<string>;
  className?: string;
  characterClass?: string;
}

// Grid configuration
const GRID_SIZE = 0.0005; // ~50 meters per tile at equator
const VISIBLE_TILES = 15; // Number of tiles visible in each direction
const INTERACTION_RANGE = 2; // Can only interact with POIs within 2 tiles

const POI_EMOJIS: Record<string, string> = {
  monster: "👹",
  npc: "👤",
  shop: "🏪",
  treasure: "💎",
  dungeon: "🚧",
  quest: "❗",
  guild: "⚔️",
  castle: "🏰",
  city: "🏙️",
  tavern: "🍺",
  temple: "⛪",
  blacksmith: "🔨",
  magic_shop: "🔮",
};

// POI sizes for different types
const POI_SIZES: Record<string, number> = {
  monster: 32,
  npc: 32,
  shop: 36,
  treasure: 28,
  dungeon: 44,
  quest: 32,
  guild: 40,
  castle: 52,
  city: 56,
  tavern: 36,
  temple: 40,
  blacksmith: 36,
  magic_shop: 36,
};

// Tier colors for special POIs
const TIER_COLORS: Record<string, string> = {
  common: "#9ca3af",
  elite: "#3b82f6",
  boss: "#a855f7",
  legendary: "#f59e0b",
};

// Class sprites mapping - All unique sprites
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

// Snap coordinate to grid
function snapToGrid(coord: number): number {
  return Math.floor(coord / GRID_SIZE) * GRID_SIZE;
}

// Seeded random for POI generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate POIs based on grid position
function generatePOIsForGrid(centerLat: number, centerLng: number): POI[] {
  const pois: POI[] = [];
  const baseSeed = Math.floor(centerLat * 10000) + Math.floor(centerLng * 10000);
  
  for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
    for (let j = -VISIBLE_TILES; j <= VISIBLE_TILES; j++) {
      const tileLat = snapToGrid(centerLat) + i * GRID_SIZE;
      const tileLng = snapToGrid(centerLng) + j * GRID_SIZE;
      
      // Use tile coordinates as seed for consistent POI generation
      const tileSeed = baseSeed + i * 1000 + j;
      const rng = seededRandom(tileSeed);
      
      // 15% chance of POI per tile
      if (rng() < 0.15) {
        const typeRoll = rng();
        let type: POI["type"];
        
        if (typeRoll < 0.25) type = "monster";
        else if (typeRoll < 0.35) type = "treasure";
        else if (typeRoll < 0.42) type = "shop";
        else if (typeRoll < 0.50) type = "npc";
        else if (typeRoll < 0.57) type = "dungeon";
        else if (typeRoll < 0.62) type = "guild";
        else if (typeRoll < 0.68) type = "castle";
        else if (typeRoll < 0.73) type = "city";
        else if (typeRoll < 0.80) type = "tavern";
        else if (typeRoll < 0.85) type = "temple";
        else if (typeRoll < 0.90) type = "blacksmith";
        else if (typeRoll < 0.95) type = "magic_shop";
        else type = "quest";
        
        const names: Record<string, string[]> = {
          monster: ["Goblin", "Orc", "Esqueleto", "Lobo Selvagem", "Bandido", "Kobold", "Rato Gigante", "Zumbi", "Aranha Gigante"],
          npc: ["Viajante", "Guarda", "Camponês", "Aventureiro", "Sábio", "Bardo Errante", "Mercador Ambulante"],
          shop: ["Loja do Ferreiro", "Empório Mágico", "Boticário", "Armeiro", "Joalheiro"],
          treasure: ["Baú Misterioso", "Tesouro Escondido", "Relíquia Antiga", "Cofre Abandonado"],
          dungeon: ["Caverna Sombria", "Cripta Antiga", "Torre Abandonada", "Ruínas Antigas", "Mina Perdida"],
          quest: ["Pedido de Ajuda", "Missão Urgente", "Contrato de Caça", "Investigação"],
          guild: ["Guilda dos Aventureiros", "Ordem dos Cavaleiros", "Liga dos Mercenários"],
          castle: ["Castelo do Barão", "Fortaleza Antiga", "Torre do Senhor", "Cidadela", "Castelo Assombrado", "Covil do Dragão"],
          city: ["Waterdeep", "Baldur's Gate", "Neverwinter", "Silverymoon", "Luskan", "Athkatla", "Suzail"],
          tavern: ["Taverna do Dragão Dourado", "Estalagem do Viajante", "O Porco Preguicoso", "A Caneca Cheia", "Taverna da Lua"],
          temple: ["Templo de Pelor", "Santuário de Tyr", "Capela de Lathander", "Templo de Mystra", "Altar de Helm"],
          blacksmith: ["Forja do Mestre", "Ferreiro Anão", "Armeiro Real", "Forja das Lendas"],
          magic_shop: ["Empório Arcano", "Loja do Mago", "Pergaminhos & Poções", "Artefatos Místicos"],
        };
        
        const nameList = names[type] || ["Desconhecido"];
        const name = nameList[Math.floor(rng() * nameList.length)];
        
        // Determine tier for special POIs
        let tier: POI["tier"] = undefined;
        if (type === "castle" || type === "dungeon" || type === "monster") {
          const tierRoll = rng();
          if (tierRoll > 0.95) tier = "legendary";
          else if (tierRoll > 0.85) tier = "boss";
          else if (tierRoll > 0.65) tier = "elite";
          else tier = "common";
        }
        
        pois.push({
          id: `poi-${tileLat.toFixed(6)}-${tileLng.toFixed(6)}`,
          type,
          name,
          latitude: tileLat + GRID_SIZE / 2,
          longitude: tileLng + GRID_SIZE / 2,
          tier,
        });
      }
    }
  }
  
  return pois;
}

// Calculate grid distance between two points
function getGridDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = Math.abs(Math.round((lat2 - lat1) / GRID_SIZE));
  const dLng = Math.abs(Math.round((lng2 - lng1) / GRID_SIZE));
  return Math.max(dLat, dLng); // Chebyshev distance
}

export default function PixelWorldMap({ 
  onPOIClick, 
  onPlayerMove,
  onRandomEncounter,
  visitedPOIs = new Set(),
  className, 
  characterClass = "fighter" 
}: PixelWorldMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const playerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const poiMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const gridLinesRef = useRef<google.maps.Polyline[]>([]);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [playerGridPosition, setPlayerGridPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Move character mutation (with movement limit and encounters)
  const moveCharacter = trpc.character.move.useMutation();
  const { data: movementStatus, refetch: refetchMovement } = trpc.character.getMovementStatus.useQuery();

  // Get user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada");
      setIsLoadingLocation(false);
      const defaultLoc = { lat: -23.5505, lng: -46.6333 };
      setUserLocation(defaultLoc);
      setPlayerGridPosition({ lat: snapToGrid(defaultLoc.lat), lng: snapToGrid(defaultLoc.lng) });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
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
        console.error("Geolocation error:", error);
        setLocationError("Não foi possível obter sua localização");
        setIsLoadingLocation(false);
        const defaultLoc = { lat: -23.5505, lng: -46.6333 };
        setUserLocation(defaultLoc);
        setPlayerGridPosition({ lat: snapToGrid(defaultLoc.lat), lng: snapToGrid(defaultLoc.lng) });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Generate POIs when player position changes (filter out visited ones)
  useEffect(() => {
    if (playerGridPosition) {
      const newPOIs = generatePOIsForGrid(playerGridPosition.lat, playerGridPosition.lng)
        .filter(poi => !visitedPOIs.has(poi.id));
      setPOIs(newPOIs);
    }
  }, [playerGridPosition, visitedPOIs]);

  // Create player marker element with pixel art sprite
  const createPlayerMarkerElement = useCallback((): HTMLElement => {
    const container = document.createElement("div");
    container.className = "player-marker-container";
    container.style.cssText = `
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      animation: playerBounce 1s ease-in-out infinite;
    `;
    
    const sprite = document.createElement("img");
    sprite.src = CLASS_SPRITES[characterClass] || CLASS_SPRITES.fighter;
    sprite.style.cssText = `
      width: 40px;
      height: 40px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    `;
    sprite.alt = "Player";
    
    container.appendChild(sprite);
    return container;
  }, [characterClass]);

  // Create POI marker element with proximity check
  const createPOIMarkerElement = useCallback((poi: POI, isInRange: boolean): HTMLElement => {
    const container = document.createElement("div");
    container.className = "poi-marker-pixel";
    
    // Get size based on POI type
    const size = POI_SIZES[poi.type] || 32;
    const fontSize = Math.floor(size * 0.7);
    
    // Get tier color if available
    const tierColor = poi.tier ? TIER_COLORS[poi.tier] : null;
    const borderColor = isInRange ? (tierColor || '#00ff00') : '#666';
    const glowColor = tierColor || '#00ff00';
    
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 3px solid ${borderColor};
      border-radius: 50%;
      cursor: ${isInRange ? 'pointer' : 'not-allowed'};
      font-size: ${fontSize}px;
      transition: all 0.2s;
      image-rendering: pixelated;
      opacity: ${isInRange ? 1 : 0.5};
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
      ${poi.tier === 'legendary' ? 'animation: legendaryGlow 2s ease-in-out infinite;' : ''}
      ${poi.tier === 'boss' ? 'animation: bossGlow 1.5s ease-in-out infinite;' : ''}
    `;
    container.innerHTML = POI_EMOJIS[poi.type] || "❓";
    container.title = isInRange ? poi.name : `${poi.name} (muito longe)`;
    
    if (isInRange) {
      container.addEventListener("mouseenter", () => {
        container.style.transform = "scale(1.3)";
        container.style.boxShadow = `0 0 15px ${glowColor}`;
        container.style.background = 'rgba(0,0,0,0.3)';
      });
      container.addEventListener("mouseleave", () => {
        container.style.transform = "scale(1)";
        container.style.boxShadow = "none";
        container.style.background = 'transparent';
      });
      container.addEventListener("click", (e) => {
        e.stopPropagation();
        onPOIClick(poi);
      });
    } else {
      container.addEventListener("click", (e) => {
        e.stopPropagation();
        toast.error("Muito longe! Aproxime-se para interagir.");
      });
    }
    
    return container;
  }, [onPOIClick]);

  // Draw grid lines on the map
  const drawGridLines = useCallback((map: google.maps.Map, center: { lat: number; lng: number }) => {
    // Clear existing grid lines
    gridLinesRef.current.forEach(line => line.setMap(null));
    gridLinesRef.current = [];

    const gridColor = "#ffd700"; // Gold color for grid
    const halfGrid = VISIBLE_TILES * GRID_SIZE;
    
    // Vertical lines
    for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
      const lng = snapToGrid(center.lng) + i * GRID_SIZE;
      const line = new google.maps.Polyline({
        path: [
          { lat: center.lat - halfGrid, lng },
          { lat: center.lat + halfGrid, lng },
        ],
        strokeColor: gridColor,
        strokeOpacity: 0.6,
        strokeWeight: 1,
        map,
      });
      gridLinesRef.current.push(line);
    }
    
    // Horizontal lines
    for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
      const lat = snapToGrid(center.lat) + i * GRID_SIZE;
      const line = new google.maps.Polyline({
        path: [
          { lat, lng: center.lng - halfGrid },
          { lat, lng: center.lng + halfGrid },
        ],
        strokeColor: gridColor,
        strokeOpacity: 0.6,
        strokeWeight: 1,
        map,
      });
      gridLinesRef.current.push(line);
    }
  }, []);

  // Move player to clicked position
  const movePlayerTo = useCallback((targetLat: number, targetLng: number) => {
    if (!playerGridPosition || isMoving) return;
    
    const snappedLat = snapToGrid(targetLat);
    const snappedLng = snapToGrid(targetLng);
    
    // Check if it's a different position
    if (snappedLat === playerGridPosition.lat && snappedLng === playerGridPosition.lng) {
      return;
    }
    
    setIsMoving(true);
    
    const newPosition = { lat: snappedLat, lng: snappedLng };
    
    // Update player position immediately for visual feedback
    setPlayerGridPosition(newPosition);
    
    if (playerMarkerRef.current) {
      playerMarkerRef.current.position = newPosition;
    }
    
    // Update in database and check for encounters
    moveCharacter.mutate({
      latitude: newPosition.lat,
      longitude: newPosition.lng,
    }, {
      onSuccess: (result) => {
        refetchMovement();
        
        // Handle random encounter if one occurred
        if (result.encounter && onRandomEncounter) {
          onRandomEncounter(result.encounter);
        }
        
        if (onPlayerMove) {
          onPlayerMove(newPosition.lat, newPosition.lng);
        }
      },
      onError: (error) => {
        // Revert position if movement failed (limit reached)
        setPlayerGridPosition(playerGridPosition);
        if (playerMarkerRef.current) {
          playerMarkerRef.current.position = playerGridPosition;
        }
        toast.error(error.message || "Não foi possível mover");
      },
    });
    
    // Redraw grid and pan map
    if (mapRef.current) {
      drawGridLines(mapRef.current, newPosition);
      mapRef.current.panTo(newPosition);
    }
    
    setTimeout(() => setIsMoving(false), 300);
  }, [playerGridPosition, isMoving, moveCharacter, onPlayerMove, onRandomEncounter, drawGridLines, refetchMovement]);

  // Handle map click - move player directly to clicked tile
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !playerGridPosition || isMoving) return;
    
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    
    movePlayerTo(clickedLat, clickedLng);
  }, [playerGridPosition, isMoving, movePlayerTo]);

  // Handle keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerGridPosition || isMoving) return;
      
      let dLat = 0, dLng = 0;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dLat = 1;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dLat = -1;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dLng = -1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dLng = 1;
          break;
        default:
          return;
      }
      
      e.preventDefault();
      
      const newLat = playerGridPosition.lat + dLat * GRID_SIZE;
      const newLng = playerGridPosition.lng + dLng * GRID_SIZE;
      
      movePlayerTo(newLat, newLng);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerGridPosition, isMoving, movePlayerTo]);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Set fantasy RPG style
    map.setOptions({
      styles: [
        // Base - dark fantasy theme
        { elementType: "geometry", stylers: [{ color: "#2d3a2e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }, { weight: 3 }] },
        
        // Water - vibrant blue like RPG ocean
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#2563eb" }, { saturation: 50 }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#93c5fd" }] },
        
        // Roads - dirt/stone paths
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#a67c52" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#5c4033" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#c9a66b" }] },
        { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#8b7355" }] },
        
        // Parks/forests - darker forest green
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e5631" }] },
        
        // Buildings - medieval stone
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#6b6b6b" }] },
        { featureType: "poi.business", elementType: "geometry", stylers: [{ color: "#8b4513" }] },
        
        // Landscape - varied terrain
        { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#4a8c3f" }] },
        { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#5a5a5a" }] },
        
        // Transit - hide for cleaner look
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        
        // Administrative boundaries - subtle
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#ffd700" }, { weight: 1 }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
      minZoom: 15,
      maxZoom: 19,
    });

    // Add click listener
    map.addListener("click", handleMapClick);

    // Draw initial grid
    if (playerGridPosition) {
      drawGridLines(map, playerGridPosition);
    }
  }, [handleMapClick, playerGridPosition, drawGridLines]);

  // Update player marker when position changes
  useEffect(() => {
    if (!mapRef.current || !playerGridPosition) return;

    if (playerMarkerRef.current) {
      playerMarkerRef.current.position = playerGridPosition;
    } else {
      playerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: playerGridPosition,
        content: createPlayerMarkerElement(),
        title: "Você",
        zIndex: 1000,
      });
    }
  }, [playerGridPosition, createPlayerMarkerElement]);

  // Update POI markers with proximity check
  useEffect(() => {
    if (!mapRef.current || !playerGridPosition) return;

    // Clear existing POI markers
    poiMarkersRef.current.forEach(marker => {
      marker.map = null;
    });
    poiMarkersRef.current = [];

    // Create new POI markers with proximity check
    pois.forEach(poi => {
      const distance = getGridDistance(
        playerGridPosition.lat, 
        playerGridPosition.lng, 
        poi.latitude, 
        poi.longitude
      );
      const isInRange = distance <= INTERACTION_RANGE;
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: poi.latitude, lng: poi.longitude },
        content: createPOIMarkerElement(poi, isInRange),
        title: poi.name,
        zIndex: 500,
      });
      poiMarkersRef.current.push(marker);
    });
  }, [pois, playerGridPosition, createPOIMarkerElement]);

  // Redraw grid when map is ready and position is set
  useEffect(() => {
    if (mapRef.current && playerGridPosition) {
      drawGridLines(mapRef.current, playerGridPosition);
    }
  }, [playerGridPosition, drawGridLines]);

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
      {userLocation && (
        <MapView
          initialCenter={userLocation}
          initialZoom={17}
          onMapReady={handleMapReady}
          className="w-full h-full"
        />
      )}
      
      {/* Movement counter */}
      {movementStatus && (
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg border-2 border-primary font-mono text-sm">
          <div className="flex items-center gap-2">
            <span>🚶</span>
            <span>{movementStatus.movesRemaining}/20</span>
          </div>
          {movementStatus.movesRemaining === 0 && (
            <div className="text-xs text-red-400 mt-1">
              Aguarde reset (próxima hora)
            </div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg border-2 border-primary text-xs">
        <div className="font-bold mb-1">Legenda:</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span>👹 Monstro</span>
          <span>🏪 Loja</span>
          <span>💎 Tesouro</span>
          <span>🏰 Dungeon</span>
          <span>⚔️ Guilda</span>
          <span>🏯 Castelo</span>
        </div>
        <div className="mt-2 text-yellow-400 text-[10px]">
          💡 Clique no mapa para mover
        </div>
        <div className="text-green-400 text-[10px]">
          ✅ Verde = pode interagir
        </div>
      </div>
      
      {/* Location error */}
      {locationError && (
        <div className="absolute top-4 right-4 bg-red-900/80 text-white px-3 py-2 rounded-lg text-sm">
          {locationError}
        </div>
      )}
      
      {/* CSS for animations */}
      <style>{`
        @keyframes playerBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
