import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { MapBoundsHandler } from './MapBoundsHandler';
import { MapFlyToHandler } from './MapFlyToHandler';
import { PlacemarkMarkers } from './PlacemarkMarkers';
import { usePlacemarksBBox } from '../lib/usePlacemarksBBox';
import type { BBox } from '../types/api';

// Fix for default marker icon in webpack/vite
// NOTE: This modifies the global Leaflet.Marker.prototype.options.icon at module load time.
// All markers across the application will use this icon configuration.
// This is a standard workaround for Vite/webpack builds where Leaflet's default icon paths don't resolve correctly.
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Selected marker icon with larger size and different color (using DivIcon for CSS styling)
export const SelectedIcon = L.divIcon({
  className: 'selected-marker-icon',
  html: `
    <div style="
      width: 35px;
      height: 35px;
      background-color: #3b82f6;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background-color: #ffffff;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
});

// Export the default icon for use in PlacemarkMarkers
export const DefaultMarkerIcon = DefaultIcon;

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
}

// Component to handle responsive sizing
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    // Invalidate size when component mounts to ensure proper rendering
    map.invalidateSize();
  }, [map]);

  return null;
}

// Component to handle placemark fetching and rendering
function PlacemarksLayer() {
  const [bbox, setBbox] = useState<BBox | null>(null);
  const { data } = usePlacemarksBBox(bbox);
  
  // Store coordinates map for fly-to functionality
  const coordinatesMapRef = useRef<Map<number, [number, number]>>(new Map());

  const handleCoordinatesMap = useCallback((placemarkId: number, coords: [number, number]) => {
    coordinatesMapRef.current.set(placemarkId, coords);
  }, []);

  const getCoordinates = useCallback((placemarkId: number) => {
    return coordinatesMapRef.current.get(placemarkId) || null;
  }, []);

  return (
    <>
      <MapBoundsHandler onBoundsChange={setBbox} />
      <MapFlyToHandler getCoordinates={getCoordinates} />
      {data?.placemarks && (
        <PlacemarkMarkers 
          placemarks={data.placemarks} 
          onCoordinatesMap={handleCoordinatesMap}
        />
      )}
    </>
  );
}

export function MapComponent({ 
  center = [36.1699, -115.1398], // Default: Las Vegas
  zoom = 13, 
  className = 'h-96 w-full' 
}: MapProps) {
  // Get tile configuration from environment variables with fallback to OpenStreetMap
  const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const apiKey = import.meta.env.VITE_MAP_API_KEY || '';
  const apiKeyParam = import.meta.env.VITE_MAP_API_KEY_PARAM || 'apikey';

  // Append API key to tile URL if provided
  const separator = tileUrl.includes('?') ? '&' : '?';
  const finalTileUrl = apiKey ? `${tileUrl}${separator}${apiKeyParam}=${apiKey}` : tileUrl;

  return (
    <div className={className} data-testid="map-container">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapResizer />
        <TileLayer
          url={finalTileUrl}
          attribution={attribution}
        />
        <PlacemarksLayer />
      </MapContainer>
    </div>
  );
}

// Export as Map for backward compatibility
export { MapComponent as Map };
