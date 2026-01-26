import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "./Map";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest" | "guild" | "castle";
  name: string;
  latitude: number;
  longitude: number;
  biome?: string;
  data?: any;
}

interface PixelWorldMapProps {
  onPOIClick: (poi: POI) => void;
  onPlayerMove?: (lat: number, lng: number) => void;
  onPOIRemove?: (poiId: string) => void;
  visitedPOIs?: Set<string>;
  className?: string;
  characterClass?: string;
}

// Grid configuration
const GRID_SIZE = 0.0005; // ~50 meters per tile at equator
const VISIBLE_TILES = 15; // Number of tiles visible in each direction

// POI Icons in pixel art style
const POI_SPRITES: Record<string, string> = {
  monster: "/sprites/monsters/goblin.png",
  npc: "/sprites/npcs/merchant.png",
  shop: "/sprites/npcs/blacksmith.png",
  treasure: "/sprites/items/gold.png",
  dungeon: "/sprites/ui/marker-monster.png",
  quest: "/sprites/ui/marker-npc.png",
};

const POI_EMOJIS: Record<string, string> = {
  monster: "👹",
  npc: "👤",
  shop: "🏪",
  treasure: "💎",
  dungeon: "🏰",
  quest: "❗",
  guild: "🏰",
  castle: "🛁",
};

// Class sprites mapping
const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/cleric.png",
  monk: "/sprites/classes/rogue.png",
  sorcerer: "/sprites/classes/mage.png",
  warlock: "/sprites/classes/mage.png",
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
  const radius = 7;
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue;
      
      const lat = snapToGrid(centerLat) + dx * GRID_SIZE;
      const lng = snapToGrid(centerLng) + dy * GRID_SIZE;
      const seed = Math.floor((lat * 10000 + lng * 100000) * 1000);
      const rng = seededRandom(seed);
      
      // 12% chance of POI
      if (rng() < 0.12) {
        const typeRoll = rng();
        let type: POI["type"];
        let name: string;
        
        if (typeRoll < 0.30) {
          type = "monster";
          const monsters = ["Goblin", "Orc", "Esqueleto", "Lobo", "Slime", "Bandido", "Aranha Gigante"];
          name = monsters[Math.floor(rng() * monsters.length)];
        } else if (typeRoll < 0.50) {
          type = "shop";
          const shops = ["Ferreiro", "Alquimista", "Mercador", "Armeiro", "Taberna"];
          name = shops[Math.floor(rng() * shops.length)];
        } else if (typeRoll < 0.65) {
          type = "npc";
          const npcs = ["Viajante", "Guarda", "Aldeão", "Sábio", "Aventureiro", "Bardo"];
          name = npcs[Math.floor(rng() * npcs.length)];
        } else if (typeRoll < 0.80) {
          type = "treasure";
          name = "Baú do Tesouro";
        } else if (typeRoll < 0.92) {
          type = "dungeon";
          const dungeons = ["Caverna Escura", "Ruínas Antigas", "Torre Abandonada", "Cripta"];
          name = dungeons[Math.floor(rng() * dungeons.length)];
        } else if (typeRoll < 0.96) {
          type = "guild";
          const guildTypes = ["Guilda dos Aventureiros", "Guilda dos Magos", "Guilda dos Guerreiros", "Guilda dos Ladinos"];
          name = guildTypes[Math.floor(rng() * guildTypes.length)];
        } else if (typeRoll < 0.99) {
          type = "castle";
          const castleTypes = ["Castelo Abandonado", "Fortaleza Sombria", "Torre do Mago", "Cidadela Real"];
          name = castleTypes[Math.floor(rng() * castleTypes.length)];
        } else {
          type = "quest";
          name = "Missão Disponível";
        }
        
        pois.push({
          id: `poi-${lat.toFixed(6)}-${lng.toFixed(6)}`,
          type,
          name,
          latitude: lat,
          longitude: lng,
          data: { seed },
        });
      }
    }
  }
  
  return pois;
}

export function PixelWorldMap({ 
  onPOIClick, 
  onPlayerMove,
  onPOIRemove,
  visitedPOIs = new Set(),
  className, 
  characterClass = "fighter" 
}: PixelWorldMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const gridOverlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const playerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const poiMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const gridLinesRef = useRef<google.maps.Polyline[]>([]);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [playerGridPosition, setPlayerGridPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Update character location mutation
  const updateLocation = trpc.character.updateLocation.useMutation();

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

  // Create POI marker element
  const createPOIMarkerElement = useCallback((poi: POI): HTMLElement => {
    const container = document.createElement("div");
    container.className = "poi-marker-pixel";
    container.style.cssText = `
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.7);
      border: 2px solid #ffd700;
      border-radius: 4px;
      cursor: pointer;
      font-size: 20px;
      transition: transform 0.2s;
      image-rendering: pixelated;
    `;
    container.innerHTML = POI_EMOJIS[poi.type] || "❓";
    container.title = poi.name;
    
    container.addEventListener("mouseenter", () => {
      container.style.transform = "scale(1.2)";
    });
    container.addEventListener("mouseleave", () => {
      container.style.transform = "scale(1)";
    });
    container.addEventListener("click", (e) => {
      e.stopPropagation();
      onPOIClick(poi);
    });
    
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
        strokeOpacity: 0.8,
        strokeWeight: 2,
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
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map,
      });
      gridLinesRef.current.push(line);
    }
  }, []);

  // Handle map click for grid-based movement
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !playerGridPosition || isMoving) return;
    
    const clickedLat = snapToGrid(e.latLng.lat());
    const clickedLng = snapToGrid(e.latLng.lng());
    
    // Calculate grid distance
    const dLat = Math.round((clickedLat - playerGridPosition.lat) / GRID_SIZE);
    const dLng = Math.round((clickedLng - playerGridPosition.lng) / GRID_SIZE);
    
    // Only allow adjacent tile movement (1 step in any direction)
    if (Math.abs(dLat) + Math.abs(dLng) === 1) {
      setIsMoving(true);
      
      const newPosition = {
        lat: playerGridPosition.lat + dLat * GRID_SIZE,
        lng: playerGridPosition.lng + dLng * GRID_SIZE,
      };
      
      setPlayerGridPosition(newPosition);
      
      // Update player marker position with animation
      if (playerMarkerRef.current) {
        playerMarkerRef.current.position = newPosition;
      }
      
      // Update in database
      updateLocation.mutate({
        latitude: newPosition.lat,
        longitude: newPosition.lng,
      });
      
      // Notify parent
      if (onPlayerMove) {
        onPlayerMove(newPosition.lat, newPosition.lng);
      }
      
      // Redraw grid
      if (mapRef.current) {
        drawGridLines(mapRef.current, newPosition);
        mapRef.current.panTo(newPosition);
      }
      
      setTimeout(() => setIsMoving(false), 200);
    } else if (Math.abs(dLat) <= VISIBLE_TILES && Math.abs(dLng) <= VISIBLE_TILES) {
      // Allow clicking further tiles - move one step towards it
      const stepLat = dLat === 0 ? 0 : (dLat > 0 ? 1 : -1);
      const stepLng = dLng === 0 ? 0 : (dLng > 0 ? 1 : -1);
      
      // Prefer diagonal movement if both are non-zero, else move in one direction
      let moveLat = 0, moveLng = 0;
      if (stepLat !== 0 && stepLng === 0) moveLat = stepLat;
      else if (stepLng !== 0 && stepLat === 0) moveLng = stepLng;
      else if (Math.abs(dLat) >= Math.abs(dLng)) moveLat = stepLat;
      else moveLng = stepLng;
      
      if (moveLat !== 0 || moveLng !== 0) {
        setIsMoving(true);
        
        const newPosition = {
          lat: playerGridPosition.lat + moveLat * GRID_SIZE,
          lng: playerGridPosition.lng + moveLng * GRID_SIZE,
        };
        
        setPlayerGridPosition(newPosition);
        
        if (playerMarkerRef.current) {
          playerMarkerRef.current.position = newPosition;
        }
        
        updateLocation.mutate({
          latitude: newPosition.lat,
          longitude: newPosition.lng,
        });
        
        if (onPlayerMove) {
          onPlayerMove(newPosition.lat, newPosition.lng);
        }
        
        if (mapRef.current) {
          drawGridLines(mapRef.current, newPosition);
          mapRef.current.panTo(newPosition);
        }
        
        setTimeout(() => setIsMoving(false), 200);
      }
    }
  }, [playerGridPosition, isMoving, updateLocation, onPlayerMove, drawGridLines]);

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
      setIsMoving(true);
      
      const newPosition = {
        lat: playerGridPosition.lat + dLat * GRID_SIZE,
        lng: playerGridPosition.lng + dLng * GRID_SIZE,
      };
      
      setPlayerGridPosition(newPosition);
      
      if (playerMarkerRef.current) {
        playerMarkerRef.current.position = newPosition;
      }
      
      updateLocation.mutate({
        latitude: newPosition.lat,
        longitude: newPosition.lng,
      });
      
      if (onPlayerMove) {
        onPlayerMove(newPosition.lat, newPosition.lng);
      }
      
      if (mapRef.current) {
        drawGridLines(mapRef.current, newPosition);
        mapRef.current.panTo(newPosition);
      }
      
      setTimeout(() => setIsMoving(false), 200);
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerGridPosition, isMoving, updateLocation, onPlayerMove, drawGridLines]);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Apply pixel art fantasy style to the map
    map.setOptions({
      styles: [
        // Base land - vibrant green like RPG grass
        { elementType: "geometry", stylers: [{ color: "#3a7d32" }, { saturation: 30 }] },
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

  // Update POI markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing POI markers
    poiMarkersRef.current.forEach(marker => {
      marker.map = null;
    });
    poiMarkersRef.current = [];

    // Create new POI markers
    pois.forEach(poi => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: poi.latitude, lng: poi.longitude },
        content: createPOIMarkerElement(poi),
        title: poi.name,
        zIndex: 500,
      });
      poiMarkersRef.current.push(marker);
    });
  }, [pois, createPOIMarkerElement]);

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
          <p className="text-muted-foreground">Obtendo sua localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Add CSS for pixel art effect */}
      <style>{`
        @keyframes playerBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        /* Pixel art rendering for map images */
        .gm-style img {
          image-rendering: pixelated !important;
          image-rendering: crisp-edges !important;
        }
        
        /* Pixelate the entire map canvas */
        .gm-style canvas {
          image-rendering: pixelated !important;
          image-rendering: crisp-edges !important;
        }
        
        /* Add scanline effect for retro feel */
        .pixel-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          );
          z-index: 10;
        }
      `}</style>
      
      {/* Pixel overlay for retro effect */}
      <div className="pixel-overlay" />
      
      <MapView
        className="w-full h-full"
        initialCenter={playerGridPosition || userLocation || { lat: -23.5505, lng: -46.6333 }}
        initialZoom={18}
        onMapReady={handleMapReady}
      />

      {/* Location error banner */}
      {locationError && (
        <div className="absolute top-4 left-4 right-4 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          {locationError}
        </div>
      )}

      {/* Grid coordinates display */}
      {playerGridPosition && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white text-xs px-3 py-2 rounded font-mono border border-primary/50">
          <div>LAT: {playerGridPosition.lat.toFixed(4)}</div>
          <div>LNG: {playerGridPosition.lng.toFixed(4)}</div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded border border-primary/50">
        <div className="font-semibold mb-1">Controles:</div>
        <div>WASD / Setas - Mover</div>
        <div>Clique - Mover para tile</div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-primary/50">
        <h4 className="text-xs font-semibold text-primary mb-2">LEGENDA</h4>
        <div className="space-y-1.5 text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">👹</span>
            <span>Monstro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏪</span>
            <span>Loja</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <span>NPC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span>Tesouro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏰</span>
            <span>Dungeon/Castelo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏰</span>
            <span>Guilda</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">❗</span>
            <span>Missão</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PixelWorldMap;
