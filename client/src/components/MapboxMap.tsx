/**
 * MAPBOX GL JS INTEGRATION FOR D&D GO
 * 
 * This component provides a Mapbox-based map view that replaces Google Maps.
 * It supports markers, custom styling, and geolocation.
 */

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

// Set the Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZG92YWgyMiIsImEiOiJjbWw5c21yZ2owNWV5M2NzOTV5OWg3b2hyIn0.VeYToWXxh4eaf4ZTH1D13w";

export interface MapboxMapProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: mapboxgl.Map) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMapMove?: (center: { lat: number; lng: number }) => void;
}

export function MapboxMap({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 15,
  onMapReady,
  onMapClick,
  onMapMove,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return;
    initialized.current = true;

    // Create the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11", // Dark fantasy style
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      pitch: 45, // 3D tilt for immersion
      bearing: 0,
      antialias: true,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    
    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    // Handle map load
    map.current.on("load", () => {
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }

      // Add 3D buildings layer for immersion
      if (map.current) {
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === "symbol" && layer.layout?.["text-field"]
        )?.id;

        map.current.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#1a1a2e",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.8,
            },
          },
          labelLayerId
        );
      }
    });

    // Handle click events
    map.current.on("click", (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    });

    // Handle move events
    map.current.on("moveend", () => {
      if (onMapMove && map.current) {
        const center = map.current.getCenter();
        onMapMove({ lat: center.lat, lng: center.lng });
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        initialized.current = false;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady, onMapClick, onMapMove]);

  return (
    <div 
      ref={mapContainer} 
      className={cn("w-full h-full", className)} 
      style={{ minHeight: "400px" }}
    />
  );
}

// Helper function to create a custom marker element
export function createMarkerElement(
  emoji: string,
  size: number = 32,
  tierColor?: string
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mapbox-marker";
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    font-size: ${size * 0.7}px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ${tierColor ? `text-shadow: 0 0 10px ${tierColor}, 0 0 20px ${tierColor};` : ""}
  `;
  el.innerHTML = emoji;
  el.onmouseenter = () => {
    el.style.transform = "scale(1.2)";
  };
  el.onmouseleave = () => {
    el.style.transform = "scale(1)";
  };
  return el;
}

// Helper function to create a sprite marker element
export function createSpriteMarkerElement(
  spriteUrl: string,
  size: number = 48,
  className?: string
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `mapbox-sprite-marker ${className || ""}`;
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background-image: url(${spriteUrl});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    image-rendering: pixelated;
    cursor: pointer;
    transition: transform 0.2s;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  `;
  el.onmouseenter = () => {
    el.style.transform = "scale(1.2)";
  };
  el.onmouseleave = () => {
    el.style.transform = "scale(1)";
  };
  return el;
}

// Export the mapboxgl for use in other components
export { mapboxgl };
