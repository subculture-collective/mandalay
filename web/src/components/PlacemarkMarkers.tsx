import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useViewStore } from '../lib/store';
import type { Placemark } from '../types/api';

interface PlacemarkMarkersProps {
  placemarks: Placemark[];
}

/**
 * Extract lat/lon coordinates from WKT POINT geometry string.
 * Only supports POINT geometry type - other types will return null.
 * @param geometry - WKT geometry string (e.g., "POINT(-115.172281 36.094506)")
 * @returns [lat, lon] tuple or null if parsing fails or geometry is not POINT
 */
function parsePointGeometry(geometry: string): [number, number] | null {
  // Match POINT(lon lat) format - note WKT uses lon/lat order
  const pointMatch = geometry.match(/POINT\(([^)]+)\)/i);
  if (pointMatch) {
    const coords = pointMatch[1].trim().split(/\s+/);
    if (coords.length === 2) {
      const lon = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lon) && !isNaN(lat)) {
        return [lat, lon]; // Return in Leaflet's [lat, lon] order
      }
    }
  }
  return null;
}

/**
 * Component to render placemark markers on the map.
 * Clicking a marker updates the selection in the shared store.
 * Markers are automatically clustered in dense areas for better readability.
 */
export function PlacemarkMarkers({ placemarks }: PlacemarkMarkersProps) {
  const selectPlacemark = useViewStore((state) => state.selectPlacemark);

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {placemarks.map((placemark) => {
        const coords = parsePointGeometry(placemark.geometry);
        if (!coords) {
          return null;
        }

        return (
          <Marker
            key={placemark.id}
            position={coords}
            eventHandlers={{
              click: () => {
                selectPlacemark(placemark.id);
              },
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{placemark.name}</h3>
                {placemark.description && (
                  <p className="mt-1 text-gray-600">{placemark.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
