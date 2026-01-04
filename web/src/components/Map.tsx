import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { MapBoundsHandler } from './MapBoundsHandler';
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

  return (
    <>
      <MapBoundsHandler onBoundsChange={setBbox} />
      {data?.placemarks && <PlacemarkMarkers placemarks={data.placemarks} />}
    </>
  );
}

export function Map({ 
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
