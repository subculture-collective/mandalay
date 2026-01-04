import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useViewStore } from '../lib/store';
import type { LatLngExpression } from 'leaflet';

interface MapFlyToHandlerProps {
  /** 
   * Function to get coordinates for a given placemark ID.
   * Returns [lat, lon] tuple or null if not found/invalid.
   */
  getCoordinates: (placemarkId: number) => [number, number] | null;
  
  /**
   * Maximum zoom level for fly-to animation.
   * Default: 16
   */
  maxZoom?: number;
  
  /**
   * Animation duration in seconds.
   * Default: 1.0
   */
  duration?: number;
  
  /**
   * Viewport padding in pixels. Only fly if marker is outside this padding.
   * Default: 100
   */
  viewportPadding?: number;
}

/**
 * Component that handles flying to selected placemarks on the map.
 * Monitors selectedPlacemarkId from the store and flies to it when changed externally.
 * Includes viewport padding check to avoid jitter.
 */
export function MapFlyToHandler({ 
  getCoordinates,
  maxZoom = 16,
  duration = 1.0,
  viewportPadding = 100,
}: MapFlyToHandlerProps) {
  const map = useMap();
  const selectedPlacemarkId = useViewStore((state) => state.selectedPlacemarkId);
  const previousIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Only fly if selection changed (avoid repeated fly-to on same selection)
    if (selectedPlacemarkId === previousIdRef.current) {
      return;
    }

    previousIdRef.current = selectedPlacemarkId;

    if (selectedPlacemarkId === null) {
      return; // No selection, no fly
    }

    const coords = getCoordinates(selectedPlacemarkId);
    if (!coords) {
      return; // Invalid coordinates, skip
    }

    const [lat, lon] = coords;
    const targetPoint = map.latLngToContainerPoint([lat, lon]);
    const mapSize = map.getSize();

    // Check if marker is within viewport with padding
    const isInViewport = 
      targetPoint.x >= viewportPadding &&
      targetPoint.x <= mapSize.x - viewportPadding &&
      targetPoint.y >= viewportPadding &&
      targetPoint.y <= mapSize.y - viewportPadding;

    // Only fly if marker is outside viewport padding (avoid jitter)
    if (!isInViewport) {
      const currentZoom = map.getZoom();
      const targetZoom = Math.max(currentZoom, maxZoom);
      
      map.flyTo([lat, lon] as LatLngExpression, targetZoom, {
        duration,
        easeLinearity: 0.25,
      });
    }
  }, [selectedPlacemarkId, getCoordinates, map, maxZoom, duration, viewportPadding]);

  return null;
}
