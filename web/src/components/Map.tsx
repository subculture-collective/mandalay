import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { MapBoundsHandler } from './MapBoundsHandler';
import { MapFlyToHandler } from './MapFlyToHandler';
import { PlacemarkMarkers } from './PlacemarkMarkers';
import { usePlacemarksBBox } from '../lib/usePlacemarksBBox';
import { MapSkeleton } from './skeletons';
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
  iconAnchor: [17.5, 17.5],
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
  const { data, isLoading, isError, error, refetch } = usePlacemarksBBox(bbox);
  
  // Store coordinates map for fly-to functionality
  const coordinatesMapRef = useRef<Map<number, [number, number]>>(new Map());

  const handleCoordinatesMap = useCallback((placemarkId: number, coords: [number, number]) => {
    coordinatesMapRef.current.set(placemarkId, coords);
  }, []);

  const getCoordinates = useCallback((placemarkId: number) => {
    return coordinatesMapRef.current.get(placemarkId) || null;
  }, []);

  // Keep coordinatesMapRef in sync with the current placemarks to avoid
  // accumulating stale entries when placemarks are added/removed over time.
  useEffect(() => {
    const coordinatesMap = coordinatesMapRef.current;

    const placemarks = data?.placemarks;
    if (!placemarks || placemarks.length === 0) {
      if (coordinatesMap.size > 0) {
        coordinatesMap.clear();
      }
      return;
    }

    const validIds = new Set<number>(placemarks.map((p) => p.id));

    for (const id of Array.from(coordinatesMap.keys())) {
      if (!validIds.has(id)) {
        coordinatesMap.delete(id);
      }
    }
  }, [data]);

  return (
    <>
      <MapBoundsHandler onBoundsChange={setBbox} />
      <MapFlyToHandler getCoordinates={getCoordinates} />
      {isLoading && <MapSkeleton />}
      {isError && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[1000] max-w-[90%] w-[400px]">
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Failed to load map markers</h3>
                <p className="mt-1 text-sm text-red-700">
                  {error?.message || 'An error occurred while loading placemarks'}
                </p>
                <button
                  onClick={() => refetch()}
                  aria-label="Retry loading map markers"
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
