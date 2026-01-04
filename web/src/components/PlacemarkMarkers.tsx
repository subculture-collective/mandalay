import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useViewStore } from '../lib/store';
import { DefaultMarkerIcon, SelectedIcon } from './Map';
import type { Placemark } from '../types/api';

interface PlacemarkMarkersProps {
  placemarks: Placemark[];
  /** Optional callback to provide coordinates for fly-to functionality */
  onCoordinatesMap?: (placemarkId: number, coords: [number, number]) => void;
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
 * Uses native Leaflet.markerCluster for clustering instead of React wrapper.
 * Clicking a marker updates the selection in the shared store.
 * Selected marker is visually emphasized with a distinct icon.
 * Markers are automatically clustered in dense areas for better readability.
 */
export function PlacemarkMarkers({ placemarks, onCoordinatesMap }: PlacemarkMarkersProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  const selectPlacemark = useViewStore((state) => state.selectPlacemark);
  const selectedPlacemarkId = useViewStore((state) => state.selectedPlacemarkId);

  // Initialize and manage cluster group
  useEffect(() => {
    if (!clusterGroupRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    return () => {
      if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map]);

  // Update markers when placemarks change
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    // Remove old markers not in new placemarks
    const newIds = new Set(placemarks.map((p) => p.id));
    for (const [id, marker] of markersRef.current.entries()) {
      if (!newIds.has(id)) {
        clusterGroupRef.current.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    placemarks.forEach((placemark) => {
      const coords = parsePointGeometry(placemark.geometry);
      if (!coords) return;

      // Call coordinate callback
      if (onCoordinatesMap) {
        onCoordinatesMap(placemark.id, coords);
      }

      const existingMarker = markersRef.current.get(placemark.id);
      if (existingMarker) {
        // Update icon if selection status changed
        const isSelected = placemark.id === selectedPlacemarkId;
        existingMarker.setIcon(isSelected ? SelectedIcon : DefaultMarkerIcon);
      } else {
        // Create new marker
        const isSelected = placemark.id === selectedPlacemarkId;
        const marker = L.marker(coords, {
          icon: isSelected ? SelectedIcon : DefaultMarkerIcon,
        });

        // Add popup
        const popupContent = document.createElement('div');
        popupContent.className = 'text-sm';
        const name = document.createElement('h3');
        name.className = 'font-semibold';
        name.textContent = placemark.name;
        popupContent.appendChild(name);

        if (placemark.description) {
          const desc = document.createElement('p');
          desc.className = 'mt-1 text-gray-600';
          desc.textContent = placemark.description;
          popupContent.appendChild(desc);
        }

        marker.bindPopup(popupContent);

        // Add click handler
        marker.on('click', () => {
          selectPlacemark(placemark.id);
        });

        clusterGroupRef.current!.addLayer(marker);
        markersRef.current.set(placemark.id, marker);
      }
    });
  }, [placemarks, selectedPlacemarkId, onCoordinatesMap, selectPlacemark]);

  // Return null since we're managing markers directly on the map
  return null;
}
