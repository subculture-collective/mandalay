import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MapBoundsHandler } from '../components/MapBoundsHandler';

// Mock react-leaflet hooks
const mockGetBounds = vi.fn();
const mockMapEvents = vi.fn();

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    getBounds: mockGetBounds,
  }),
  useMapEvents: (events: Record<string, () => void>) => {
    mockMapEvents(events);
    return null;
  },
}));

describe('MapBoundsHandler', () => {
  it('calls onBoundsChange with initial bounds on mount', () => {
    const onBoundsChange = vi.fn();
    
    // Mock bounds
    mockGetBounds.mockReturnValue({
      getWest: () => -115.2,
      getSouth: () => 36.0,
      getEast: () => -115.1,
      getNorth: () => 36.1,
    });

    renderHook(() => {
      const handler = MapBoundsHandler({ onBoundsChange });
      return handler;
    });

    expect(onBoundsChange).toHaveBeenCalledWith({
      min_lon: -115.2,
      min_lat: 36.0,
      max_lon: -115.1,
      max_lat: 36.1,
    });
  });

  it('registers moveend event handler', () => {
    const onBoundsChange = vi.fn();
    
    mockGetBounds.mockReturnValue({
      getWest: () => -115.2,
      getSouth: () => 36.0,
      getEast: () => -115.1,
      getNorth: () => 36.1,
    });

    renderHook(() => {
      const handler = MapBoundsHandler({ onBoundsChange });
      return handler;
    });

    // Verify that useMapEvents was called with an object containing moveend
    expect(mockMapEvents).toHaveBeenCalled();
    const eventHandlers = mockMapEvents.mock.calls[0][0];
    expect(eventHandlers).toHaveProperty('moveend');
    expect(typeof eventHandlers.moveend).toBe('function');
  });

  it('calls onBoundsChange when moveend event fires', () => {
    const onBoundsChange = vi.fn();
    let moveendHandler: (() => void) | undefined;
    
    // Capture the moveend handler
    mockMapEvents.mockImplementation((events: Record<string, () => void>) => {
      moveendHandler = events.moveend;
    });

    // Initial bounds
    mockGetBounds.mockReturnValue({
      getWest: () => -115.2,
      getSouth: () => 36.0,
      getEast: () => -115.1,
      getNorth: () => 36.1,
    });

    renderHook(() => {
      const handler = MapBoundsHandler({ onBoundsChange });
      return handler;
    });

    // Clear the initial call
    onBoundsChange.mockClear();

    // Change bounds
    mockGetBounds.mockReturnValue({
      getWest: () => -115.3,
      getSouth: () => 36.05,
      getEast: () => -115.2,
      getNorth: () => 36.15,
    });

    // Trigger moveend
    expect(moveendHandler).toBeDefined();
    moveendHandler!();

    // Verify onBoundsChange was called with new bounds
    expect(onBoundsChange).toHaveBeenCalledWith({
      min_lon: -115.3,
      min_lat: 36.05,
      max_lon: -115.2,
      max_lat: 36.15,
    });
  });

  it('returns null (no rendered output)', () => {
    const onBoundsChange = vi.fn();
    
    mockGetBounds.mockReturnValue({
      getWest: () => -115.2,
      getSouth: () => 36.0,
      getEast: () => -115.1,
      getNorth: () => 36.1,
    });

    const result = renderHook(() => {
      return MapBoundsHandler({ onBoundsChange });
    });

    expect(result.result.current).toBeNull();
  });
});
