import { Marker, Popup } from 'react-leaflet';
import { useViewStore } from '../lib/store';
import type { Placemark } from '../types/api';

interface PlacemarkMarkersProps {
  placemarks: Placemark[];
}

/**
 * Extract lat/lon coordinates from WKT geometry string.
 * Currently supports POINT geometry type.
 * @param geometry - WKT geometry string (e.g., "POINT(-115.172281 36.094506)")
 * @returns [lat, lon] tuple or null if parsing fails
 */
function parseGeometryCoordinates(geometry: string): [number, number] | null {
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
 */
export function PlacemarkMarkers({ placemarks }: PlacemarkMarkersProps) {
  const selectPlacemark = useViewStore((state) => state.selectPlacemark);

  return (
    <>
      {placemarks.map((placemark) => {
        const coords = parseGeometryCoordinates(placemark.geometry);
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
    </>
  );
}
