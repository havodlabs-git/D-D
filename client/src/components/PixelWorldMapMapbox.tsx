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

// Grid configuration - NO LIMITS
const GRID_SIZE = 0.0001;
const VISIBLE_TILES = 30;

// POI Emojis as text labels for Symbol Layer (most reliable approach)
const POI_EMOJIS: Record<string, string> = {
  monster: "👹", npc: "👤", shop: "🏪", treasure: "💎",
  dungeon: "🚧", quest: "❗", guild: "⚔️", castle: "🏰",
  city: "🏙️", tavern: "🍺", temple: "⛪", blacksmith: "🔨",
  magic_shop: "🔮",
};

const POI_SIZES: Record<string, number> = {
  monster: 1.2, npc: 1.0, shop: 1.2, treasure: 1.0, dungeon: 1.4,
  quest: 1.0, guild: 1.3, castle: 1.6, city: 1.6, tavern: 1.2,
  temple: 1.3, blacksmith: 1.2, magic_shop: 1.2,
};

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

function generatePOIsForGrid(centerLat: number, centerLng: number): POI[] {
  const pois: POI[] = [];
  const baseSeed = Math.floor(centerLat * 10000) + Math.floor(centerLng * 10000);
  
  for (let i = -VISIBLE_TILES; i <= VISIBLE_TILES; i++) {
    for (let j = -VISIBLE_TILES; j <= VISIBLE_TILES; j++) {
      const tileLat = snapToGrid(centerLat) + i * GRID_SIZE;
      const tileLng = snapToGrid(centerLng) + j * GRID_SIZE;
      const tileSeed = baseSeed + i * 1000 + j;
      const rng = seededRandom(tileSeed);
      
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
          castle: ["Castelo do Barão", "Fortaleza Antiga", "Torre do Senhor", "Cidadela", "Castelo Assombrado"],
          city: ["Waterdeep", "Baldur's Gate", "Neverwinter", "Silverymoon", "Luskan"],
          tavern: ["Taverna do Dragão Dourado", "Estalagem do Viajante", "O Porco Preguicoso", "A Caneca Cheia"],
          temple: ["Templo de Pelor", "Santuário de Tyr", "Capela de Lathander", "Templo de Mystra"],
          blacksmith: ["Forja do Mestre", "Ferreiro Anão", "Armeiro Real", "Forja das Lendas"],
          magic_shop: ["Empório Arcano", "Loja do Mago", "Pergaminhos & Poções", "Artefatos Místicos"],
        };
        
        const nameList = names[type] || ["Desconhecido"];
        const name = nameList[Math.floor(rng() * nameList.length)];
        
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
        emoji: POI_EMOJIS[poi.type] || "❓",
        size: POI_SIZES[poi.type] || 1.0,
        tierColor: poi.tier ? TIER_COLORS[poi.tier] : "#00ff00",
      },
    })),
  };
}

// Stable empty defaults to avoid re-render loops
const EMPTY_SET = new Set<string>();
const EMPTY_PLAYERS: OnlinePlayer[] = [];

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

    // Fast fallback timer - if geolocation takes more than 3s, use default
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
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  // Generate POIs when player position changes
  // Use a ref to track visitedPOIs to avoid re-render loops
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

  // Initialize Mapbox map with Symbol Layers for POIs
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

    map.on("load", () => {
      console.log("[Map] Map loaded, setting up layers...");
      
      // Create player marker (DOM marker - only one, so no performance issue)
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

      // Add a circle layer as background for POI icons
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
          "circle-color": "rgba(0, 0, 0, 0.75)",
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match", ["get", "tier"],
            "legendary", "#f59e0b",
            "boss", "#a855f7",
            "elite", "#3b82f6",
            "common", "#9ca3af",
            "#00ff00"
          ],
        },
      });

      // Add symbol layer for POI emoji icons
      map.addLayer({
        id: "pois-symbol-layer",
        type: "symbol",
        source: "pois-source",
        layout: {
          "text-field": ["get", "emoji"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            14, 12,
            16, 20,
            18, 28,
            20, 36,
          ],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-anchor": "center",
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add symbol layer for POI name labels
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

      console.log("[Map] Symbol layers created with", currentPOIs.length, "POIs");

      // Handle click on POI symbols
      map.on("click", "pois-symbol-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const props = feature.properties;
        
        if (props) {
          // Find the matching POI from our state
          const clickedPOI = poisRef.current.find(p => p.id === props.id);
          if (clickedPOI) {
            e.originalEvent.stopPropagation();
            onPOIClick(clickedPOI);
          }
        }
      });

      // Also handle click on background circles
      map.on("click", "pois-bg-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        
        const feature = e.features[0];
        const props = feature.properties;
        
        if (props) {
          const clickedPOI = poisRef.current.find(p => p.id === props.id);
          if (clickedPOI) {
            e.originalEvent.stopPropagation();
            onPOIClick(clickedPOI);
          }
        }
      });

      // Change cursor on hover
      map.on("mouseenter", "pois-symbol-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pois-symbol-layer", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "pois-bg-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pois-bg-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      // Show tooltip on hover
      map.on("mousemove", "pois-symbol-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props) {
          const coords = (e.features[0].geometry as any).coordinates.slice();
          
          if (popupRef.current) {
            popupRef.current.remove();
          }
          
          popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "poi-popup",
            offset: 25,
          })
            .setLngLat(coords)
            .setHTML(`<div style="background:#1a1a2e;color:#fff;padding:6px 10px;border-radius:6px;border:1px solid ${props.tierColor || '#00ff00'};font-size:12px;font-family:monospace;"><strong>${props.name}</strong>${props.tier && props.tier !== 'common' ? `<br/><span style="color:${props.tierColor}">${props.tier.toUpperCase()}</span>` : ''}</div>`)
            .addTo(map);
        }
      });

      map.on("mouseleave", "pois-symbol-layer", () => {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });
    });

    // Handle click events on map (not on POIs) - move player to clicked position
    map.on("click", (e) => {
      // Only move if no POI was clicked (the POI click handlers call stopPropagation)
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

  // Render online players (DOM markers - few players so no issue)
  useEffect(() => {
    // We'll skip online players for now as they're not critical
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
      
      {/* POI counter */}
      <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg border-2 border-primary font-mono text-sm z-10">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{poiCount} POIs</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg border-2 border-primary text-xs z-10">
        <div className="font-bold mb-1">Legenda:</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span>👹 Monstro</span>
          <span>🏪 Loja</span>
          <span>💎 Tesouro</span>
          <span>🚧 Dungeon</span>
          <span>⚔️ Guilda</span>
          <span>🏰 Castelo</span>
        </div>
        <div className="mt-2 text-yellow-400 text-[10px]">
          Clique no mapa para mover | WASD para andar
        </div>
      </div>
      
      {/* Location error */}
      {locationError && (
        <div className="absolute top-4 right-20 bg-yellow-900/80 text-white px-3 py-2 rounded-lg text-sm z-10">
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
          border-top-color: #1a1a2e !important;
        }
      `}</style>
    </div>
  );
}
