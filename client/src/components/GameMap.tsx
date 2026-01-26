import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "./Map";
import { trpc } from "@/lib/trpc";
import { Loader2, Swords, User, ShoppingBag, Gem, Castle } from "lucide-react";
import { cn } from "@/lib/utils";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
  name: string;
  latitude: number;
  longitude: number;
  biome: string;
  data: any;
}

interface GameMapProps {
  onPOIClick: (poi: POI) => void;
  className?: string;
}

const POI_ICONS: Record<string, string> = {
  monster: "⚔️",
  npc: "👤",
  shop: "🛒",
  treasure: "💎",
  dungeon: "🏰",
};

const POI_COLORS: Record<string, string> = {
  monster: "#dc2626", // red
  npc: "#22c55e", // green
  shop: "#eab308", // yellow/gold
  treasure: "#f59e0b", // amber
  dungeon: "#7c3aed", // purple
};

export function GameMap({ onPOIClick, className }: GameMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const playerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Update character location mutation
  const updateLocation = trpc.character.updateLocation.useMutation();

  // Fetch POIs query
  const { data: pois, refetch: refetchPOIs } = trpc.world.getPOIs.useQuery(
    {
      latitude: userLocation?.lat ?? 0,
      longitude: userLocation?.lng ?? 0,
      radius: 500,
    },
    {
      enabled: !!userLocation,
      staleTime: 60000, // 1 minute
    }
  );

  // Get user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada pelo navegador");
      setIsLoadingLocation(false);
      // Use default location (São Paulo)
      setUserLocation({ lat: -23.5505, lng: -46.6333 });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        setIsLoadingLocation(false);
        setLocationError(null);

        // Update character location in database
        updateLocation.mutate({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
        });

        // Center map on user
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Não foi possível obter sua localização");
        setIsLoadingLocation(false);
        // Use default location
        setUserLocation({ lat: -23.5505, lng: -46.6333 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Create custom marker element
  const createMarkerElement = useCallback((poi: POI): HTMLElement => {
    const container = document.createElement("div");
    container.className = `poi-marker poi-${poi.type}`;
    container.innerHTML = POI_ICONS[poi.type] || "❓";
    container.title = poi.name;
    
    // Add click handler
    container.addEventListener("click", () => {
      onPOIClick(poi);
    });

    return container;
  }, [onPOIClick]);

  // Create player marker element
  const createPlayerMarkerElement = useCallback((): HTMLElement => {
    const container = document.createElement("div");
    container.className = "relative";
    container.innerHTML = `
      <div class="w-12 h-12 rounded-full bg-primary border-4 border-primary-foreground flex items-center justify-center text-2xl shadow-lg marker-pulse">
        🧙
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45 -z-10"></div>
    `;
    return container;
  }, []);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Set dark fantasy style
    map.setOptions({
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8b8b8b" }] },
        {
          featureType: "administrative",
          elementType: "geometry.stroke",
          stylers: [{ color: "#4a4a6a" }],
        },
        {
          featureType: "administrative.land_parcel",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b6b8b" }],
        },
        {
          featureType: "landscape",
          elementType: "geometry",
          stylers: [{ color: "#1a1a2e" }],
        },
        {
          featureType: "poi",
          elementType: "geometry",
          stylers: [{ color: "#252540" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#7b7b9b" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#1a3a2e" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#2a2a4e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1a1a2e" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#3a3a5e" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2a2a4e" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0a1a3e" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#4a6a8e" }],
        },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Add click listener for map
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const clickedLocation = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        
        // Move player to clicked location (simulating movement)
        setUserLocation(clickedLocation);
        updateLocation.mutate({
          latitude: clickedLocation.lat,
          longitude: clickedLocation.lng,
        });

        // Update player marker
        if (playerMarkerRef.current) {
          playerMarkerRef.current.position = clickedLocation;
        }

        // Refetch POIs for new location
        refetchPOIs();
      }
    });
  }, [updateLocation, refetchPOIs]);

  // Update markers when POIs change
  useEffect(() => {
    if (!mapRef.current || !pois) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    // Create new markers
    pois.forEach((poi) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: poi.latitude, lng: poi.longitude },
        content: createMarkerElement(poi),
        title: poi.name,
      });
      markersRef.current.push(marker);
    });
  }, [pois, createMarkerElement]);

  // Update player marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (playerMarkerRef.current) {
      playerMarkerRef.current.position = userLocation;
    } else {
      playerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: userLocation,
        content: createPlayerMarkerElement(),
        title: "Você",
        zIndex: 1000,
      });
    }
  }, [userLocation, createPlayerMarkerElement]);

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
      <MapView
        className="w-full h-full"
        initialCenter={userLocation || { lat: -23.5505, lng: -46.6333 }}
        initialZoom={16}
        onMapReady={handleMapReady}
      />

      {/* Location error banner */}
      {locationError && (
        <div className="absolute top-4 left-4 right-4 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          {locationError}
        </div>
      )}

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 border border-border">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">LEGENDA</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-[10px]">⚔️</span>
            <span>Monstro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px]">👤</span>
            <span>NPC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px]">🛒</span>
            <span>Loja</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--rarity-legendary)] flex items-center justify-center text-[10px]">💎</span>
            <span>Tesouro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px]">🏰</span>
            <span>Masmorra</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-border text-xs text-muted-foreground max-w-[200px]">
        <p>Clique no mapa para mover seu personagem ou toque nos ícones para interagir</p>
      </div>
    </div>
  );
}
