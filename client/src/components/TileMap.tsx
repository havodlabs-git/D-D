import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// Tile types with their properties
export const TILE_TYPES = {
  grass: { sprite: "/sprites/tiles/grass.png", walkable: true, name: "Grama" },
  water: { sprite: "/sprites/tiles/water.png", walkable: false, name: "Água" },
  lava: { sprite: "/sprites/tiles/lava.png", walkable: false, name: "Lava", damage: 10 },
  mountain: { sprite: "/sprites/tiles/mountain.png", walkable: false, name: "Montanha" },
  forest: { sprite: "/sprites/tiles/forest.png", walkable: true, name: "Floresta" },
  sand: { sprite: "/sprites/tiles/sand.png", walkable: true, name: "Areia" },
  snow: { sprite: "/sprites/tiles/snow.png", walkable: true, name: "Neve" },
  swamp: { sprite: "/sprites/tiles/swamp.png", walkable: true, name: "Pântano", slowdown: true },
  road: { sprite: "/sprites/tiles/road.png", walkable: true, name: "Estrada" },
  dungeon: { sprite: "/sprites/tiles/dungeon.png", walkable: true, name: "Dungeon" },
} as const;

export type TileType = keyof typeof TILE_TYPES;

// POI types for map markers
export const POI_TYPES = {
  monster: { icon: "👹", color: "bg-red-500" },
  shop: { icon: "🏪", color: "bg-yellow-500" },
  npc: { icon: "👤", color: "bg-blue-500" },
  treasure: { icon: "💎", color: "bg-purple-500" },
  dungeon: { icon: "🏰", color: "bg-gray-500" },
  quest: { icon: "❗", color: "bg-green-500" },
} as const;

export type POIType = keyof typeof POI_TYPES;

export interface POI {
  x: number;
  y: number;
  type: POIType;
  id: string;
  name?: string;
}

export interface TileMapProps {
  width?: number;
  height?: number;
  tileSize?: number;
  playerPosition: { x: number; y: number };
  onPlayerMove: (x: number, y: number) => void;
  onTileClick?: (x: number, y: number, tile: TileType) => void;
  onPOIClick?: (poi: POI) => void;
  pois?: POI[];
  seed?: number;
  characterClass?: string;
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate terrain based on coordinates using noise-like algorithm
function generateTerrain(x: number, y: number, seed: number): TileType {
  const rng = seededRandom(seed + x * 1000 + y);
  const noise = rng();
  
  // Create more interesting terrain patterns
  const worldX = (x + seed) * 0.1;
  const worldY = (y + seed) * 0.1;
  
  // Simple noise-like function
  const n1 = Math.sin(worldX * 0.5) * Math.cos(worldY * 0.5);
  const n2 = Math.sin(worldX * 0.3 + 1) * Math.cos(worldY * 0.3 + 1);
  const combined = (n1 + n2 + noise) / 3;
  
  // Determine tile type based on combined noise value
  // Prioritize walkable terrain for better gameplay
  if (combined < -0.4) return "water";
  if (combined < -0.25) return "sand";
  if (combined < 0.15) return "grass";
  if (combined < 0.35) return "forest";
  if (combined < 0.5) return "road";
  if (combined < 0.65) return "swamp";
  if (combined < 0.8) return "mountain";
  if (combined < 0.9) return "snow";
  if (combined < 0.95) return "lava";
  return "dungeon";
}

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

export function TileMap({
  width = 15,
  height = 11,
  tileSize = 48,
  playerPosition,
  onPlayerMove,
  onTileClick,
  onPOIClick,
  pois = [],
  seed = 12345,
  characterClass = "fighter",
}: TileMapProps) {
  const [tiles, setTiles] = useState<TileType[][]>([]);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Generate tiles around player position
  useEffect(() => {
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    const newTiles: TileType[][] = [];
    
    for (let y = 0; y < height; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < width; x++) {
        const worldX = playerPosition.x - halfWidth + x;
        const worldY = playerPosition.y - halfHeight + y;
        row.push(generateTerrain(worldX, worldY, seed));
      }
      newTiles.push(row);
    }
    
    setTiles(newTiles);
    setViewOffset({ x: playerPosition.x - halfWidth, y: playerPosition.y - halfHeight });
  }, [playerPosition, width, height, seed]);

  // Handle tile click for movement
  const handleTileClick = useCallback((screenX: number, screenY: number) => {
    if (isMoving) return;
    
    const worldX = viewOffset.x + screenX;
    const worldY = viewOffset.y + screenY;
    
    // Check if clicked tile is adjacent to player
    const dx = Math.abs(worldX - playerPosition.x);
    const dy = Math.abs(worldY - playerPosition.y);
    
    if (dx + dy === 1) {
      // Adjacent tile - try to move
      const tileType = tiles[screenY]?.[screenX];
      if (tileType && TILE_TYPES[tileType].walkable) {
        setIsMoving(true);
        onPlayerMove(worldX, worldY);
        setTimeout(() => setIsMoving(false), 200);
      }
    } else if (dx === 0 && dy === 0) {
      // Clicked on player tile
      const tileType = tiles[screenY]?.[screenX];
      if (tileType && onTileClick) {
        onTileClick(worldX, worldY, tileType);
      }
    }
  }, [isMoving, viewOffset, playerPosition, tiles, onPlayerMove, onTileClick]);

  // Handle keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMoving) return;
      
      let newX = playerPosition.x;
      let newY = playerPosition.y;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          newY -= 1;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          newY += 1;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          newX -= 1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          newX += 1;
          break;
        default:
          return;
      }
      
      e.preventDefault();
      
      // Check if new position is walkable
      const halfWidth = Math.floor(width / 2);
      const halfHeight = Math.floor(height / 2);
      const screenX = newX - viewOffset.x;
      const screenY = newY - viewOffset.y;
      
      if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
        const tileType = tiles[screenY]?.[screenX];
        if (tileType && TILE_TYPES[tileType].walkable) {
          setIsMoving(true);
          onPlayerMove(newX, newY);
          setTimeout(() => setIsMoving(false), 200);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMoving, playerPosition, tiles, viewOffset, width, height, onPlayerMove]);

  // Get POI at position
  const getPOIAt = (worldX: number, worldY: number): POI | undefined => {
    return pois.find(poi => poi.x === worldX && poi.y === worldY);
  };

  // Get player sprite based on class
  const playerSprite = CLASS_SPRITES[characterClass] || CLASS_SPRITES.fighter;

  return (
    <div className="relative overflow-hidden rounded-lg border-4 border-primary/50 bg-black">
      {/* Map grid */}
      <div
        ref={mapRef}
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${width}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${height}, ${tileSize}px)`,
        }}
      >
        {tiles.map((row, y) =>
          row.map((tile, x) => {
            const worldX = viewOffset.x + x;
            const worldY = viewOffset.y + y;
            const isPlayerTile = worldX === playerPosition.x && worldY === playerPosition.y;
            const poi = getPOIAt(worldX, worldY);
            const isAdjacent = 
              Math.abs(worldX - playerPosition.x) + Math.abs(worldY - playerPosition.y) === 1;
            const tileData = TILE_TYPES[tile];
            
            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "relative cursor-pointer transition-all duration-100",
                  isAdjacent && tileData.walkable && "ring-2 ring-primary/50 hover:ring-primary",
                  isAdjacent && !tileData.walkable && "opacity-70",
                  !isAdjacent && !isPlayerTile && "hover:brightness-110"
                )}
                style={{
                  width: tileSize,
                  height: tileSize,
                }}
                onClick={() => {
                  if (poi && onPOIClick) {
                    onPOIClick(poi);
                  } else {
                    handleTileClick(x, y);
                  }
                }}
              >
                {/* Tile background */}
                <img
                  src={tileData.sprite}
                  alt={tileData.name}
                  className="w-full h-full pixelated object-cover"
                  draggable={false}
                />
                
                {/* Grid overlay */}
                <div className="absolute inset-0 border border-black/20 pointer-events-none" />
                
                {/* POI marker */}
                {poi && !isPlayerTile && (
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    "animate-bounce"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-lg",
                      "shadow-lg border-2 border-white",
                      POI_TYPES[poi.type].color
                    )}>
                      {POI_TYPES[poi.type].icon}
                    </div>
                  </div>
                )}
                
                {/* Player sprite */}
                {isPlayerTile && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <img
                      src={playerSprite}
                      alt="Player"
                      className={cn(
                        "w-10 h-10 pixelated drop-shadow-lg",
                        isMoving && "animate-pulse"
                      )}
                      draggable={false}
                    />
                  </div>
                )}
                
                {/* Lava glow effect */}
                {tile === "lava" && (
                  <div className="absolute inset-0 bg-orange-500/20 animate-pulse pointer-events-none" />
                )}
                
                {/* Water shimmer effect */}
                {tile === "water" && (
                  <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Coordinates display */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
        X: {playerPosition.x} Y: {playerPosition.y}
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        WASD ou Setas para mover
      </div>
    </div>
  );
}

export default TileMap;
