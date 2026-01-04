import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { BBox } from '../types/api';

interface MapBoundsHandlerProps {
  onBoundsChange: (bbox: BBox) => void;
}

/**
 * Component to track map bounds and report changes.
 * This component handles the moveend event to detect when the user
 * has finished panning or zooming the map.
 */
export function MapBoundsHandler({ onBoundsChange }: MapBoundsHandlerProps) {
  const map = useMap();

  // Report initial bounds on mount
  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      min_lon: bounds.getWest(),
      min_lat: bounds.getSouth(),
      max_lon: bounds.getEast(),
      max_lat: bounds.getNorth(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Listen for map movement events
  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        min_lon: bounds.getWest(),
        min_lat: bounds.getSouth(),
        max_lon: bounds.getEast(),
        max_lat: bounds.getNorth(),
      });
    },
  });

  return null;
}
