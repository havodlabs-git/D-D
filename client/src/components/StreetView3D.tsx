import { useCallback, useEffect, useRef, useState } from "react";
import { MapView } from "./Map";
import { cn } from "@/lib/utils";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon" | "quest" | "guild" | "castle" | "city" | "tavern" | "temple" | "blacksmith" | "magic_shop";
  name: string;
  latitude: number;
  longitude: number;
  data?: any;
  tier?: "common" | "elite" | "boss" | "legendary";
}

interface StreetView3DProps {
  playerPosition: { lat: number; lng: number };
  playerHeading: number;
  characterClass: string;
  pois: POI[];
  onPOIClick: (poi: POI) => void;
  onMove: (direction: "forward" | "backward" | "left" | "right") => void;
  className?: string;
}

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
  druid: "/sprites/classes/druid.png",
  monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png",
  warlock: "/sprites/classes/warlock.png",
};

// POI icons for 3D view
const POI_3D_ICONS: Record<string, string> = {
  monster: "👹",
  npc: "👤",
  shop: "🏪",
  treasure: "💎",
  dungeon: "🏰",
  quest: "❗",
  guild: "⚔️",
  castle: "🏰",
  city: "🏙️",
  tavern: "🍺",
  temple: "⛪",
  blacksmith: "🔨",
  magic_shop: "🔮",
};

// Calculate distance between two points in meters
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate bearing between two points
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

export default function StreetView3D({
  playerPosition,
  playerHeading,
  characterClass,
  pois,
  onPOIClick,
  onMove,
  className,
}: StreetView3DProps) {
  const streetViewRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStreetViewAvailable, setIsStreetViewAvailable] = useState(true);
  const [nearbyPOIs, setNearbyPOIs] = useState<Array<POI & { distance: number; bearing: number }>>([]);

  // Initialize Street View
  const handleMapReady = useCallback((map: google.maps.Map) => {
    if (!containerRef.current) return;

    const streetViewService = new google.maps.StreetViewService();
    
    // Check if Street View is available at this location
    streetViewService.getPanorama(
      { location: playerPosition, radius: 50 },
      (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setIsStreetViewAvailable(true);
          
          // Create Street View panorama
          const panorama = new google.maps.StreetViewPanorama(containerRef.current!, {
            position: data.location.latLng,
            pov: { heading: playerHeading, pitch: 0 },
            zoom: 1,
            disableDefaultUI: true,
            showRoadLabels: false,
            clickToGo: false,
            scrollwheel: false,
            motionTracking: false,
            motionTrackingControl: false,
          });
          
          streetViewRef.current = panorama;
          
          // Add custom overlay for character
          addCharacterOverlay(panorama);
        } else {
          setIsStreetViewAvailable(false);
        }
      }
    );
  }, [playerPosition, playerHeading]);

  // Add character overlay at bottom center
  const addCharacterOverlay = (panorama: google.maps.StreetViewPanorama) => {
    // Character will be rendered via React, not as a Maps overlay
  };

  // Update Street View position when player moves
  useEffect(() => {
    if (streetViewRef.current) {
      const streetViewService = new google.maps.StreetViewService();
      
      streetViewService.getPanorama(
        { location: playerPosition, radius: 50 },
        (data, status) => {
          if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            streetViewRef.current?.setPosition(data.location.latLng);
            streetViewRef.current?.setPov({ heading: playerHeading, pitch: 0 });
          }
        }
      );
    }
  }, [playerPosition, playerHeading]);

  // Calculate nearby POIs with distance and bearing
  useEffect(() => {
    const nearby = pois
      .map(poi => ({
        ...poi,
        distance: getDistanceMeters(playerPosition.lat, playerPosition.lng, poi.latitude, poi.longitude),
        bearing: getBearing(playerPosition.lat, playerPosition.lng, poi.latitude, poi.longitude),
      }))
      .filter(poi => poi.distance <= 100) // Only show POIs within 100 meters
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Max 10 POIs
    
    setNearbyPOIs(nearby);
  }, [playerPosition, pois]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          onMove("forward");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          onMove("backward");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          onMove("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          onMove("right");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  // Calculate POI screen position based on bearing relative to player heading
  const getPOIScreenPosition = (poiBearing: number, distance: number) => {
    // Calculate angle relative to player's view direction
    let relativeAngle = poiBearing - playerHeading;
    if (relativeAngle > 180) relativeAngle -= 360;
    if (relativeAngle < -180) relativeAngle += 360;
    
    // Only show POIs in front of player (within 90 degrees of view)
    if (Math.abs(relativeAngle) > 70) return null;
    
    // Convert angle to screen X position (0-100%)
    const x = 50 + (relativeAngle / 70) * 45;
    
    // Y position based on distance (closer = lower on screen)
    const maxDistance = 100;
    const y = 30 + (1 - distance / maxDistance) * 40;
    
    // Size based on distance
    const size = Math.max(24, 60 - (distance / maxDistance) * 36);
    
    return { x, y, size };
  };

  const characterSprite = CLASS_SPRITES[characterClass.toLowerCase()] || CLASS_SPRITES.fighter;

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Street View Container */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Fallback if Street View not available */}
      {!isStreetViewAvailable && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-green-400 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-lg font-bold mb-2">Street View não disponível</p>
            <p className="text-sm opacity-80">Use o mapa para navegar</p>
          </div>
        </div>
      )}
      
      {/* POI Markers in 3D space */}
      <div className="absolute inset-0 pointer-events-none">
        {nearbyPOIs.map(poi => {
          const pos = getPOIScreenPosition(poi.bearing, poi.distance);
          if (!pos) return null;
          
          return (
            <div
              key={poi.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-all duration-200 hover:scale-125"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                fontSize: `${pos.size}px`,
                zIndex: Math.floor(100 - poi.distance),
              }}
              onClick={() => onPOIClick(poi)}
            >
              <div className="relative">
                <span className="drop-shadow-lg">{POI_3D_ICONS[poi.type] || "❓"}</span>
                <div 
                  className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white drop-shadow-lg bg-black/50 px-1 rounded"
                  style={{ fontSize: `${Math.max(8, pos.size / 4)}px` }}
                >
                  {poi.name} ({Math.round(poi.distance)}m)
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Character at bottom center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="relative">
          <img 
            src={characterSprite} 
            alt="Character" 
            className="w-24 h-24 object-contain drop-shadow-2xl"
            style={{ imageRendering: "pixelated" }}
          />
          {/* Circular highlight under character */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-white/30 rounded-full blur-sm" />
        </div>
      </div>
      
      {/* Movement Controls (touch-friendly) */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-1">
        <button
          onClick={() => onMove("forward")}
          className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center text-white text-2xl transition-colors"
        >
          ↑
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => onMove("left")}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center text-white text-2xl transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => onMove("backward")}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center text-white text-2xl transition-colors"
          >
            ↓
          </button>
          <button
            onClick={() => onMove("right")}
            className="w-12 h-12 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center text-white text-2xl transition-colors"
          >
            →
          </button>
        </div>
      </div>
      
      {/* Compass */}
      <div className="absolute top-4 right-4 z-50">
        <div 
          className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center"
          style={{ transform: `rotate(${-playerHeading}deg)` }}
        >
          <div className="text-red-500 text-xl">▲</div>
        </div>
        <div className="text-center text-white text-xs mt-1 font-bold drop-shadow">
          {Math.round(playerHeading)}°
        </div>
      </div>
      
      {/* Hidden MapView for initialization */}
      <div className="hidden">
        <MapView onMapReady={handleMapReady} />
      </div>
    </div>
  );
}
