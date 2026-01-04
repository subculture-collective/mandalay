import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { Map } from '../components/Map';
import { useViewStore } from '../lib/store';
import type { BBoxResponse } from '../types/api';

// Mock the API
vi.mock('../lib/api', () => ({
  fetchPlacemarksBBox: vi.fn(),
}));

import { fetchPlacemarksBBox } from '../lib/api';

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  useMap: () => ({
    invalidateSize: vi.fn(),
    getBounds: vi.fn(() => ({
      getWest: () => -115.2,
      getSouth: () => 36.0,
      getEast: () => -115.1,
      getNorth: () => 36.1,
    })),
  }),
  useMapEvents: (events: { moveend?: () => void }) => {
    // Store the moveend handler for later use
    if (events.moveend) {
      (globalThis as any).__mockMoveEndHandler = events.moveend;
    }
    return null;
  },
  Marker: ({ 
    children, 
    eventHandlers, 
    position 
  }: { 
    children?: React.ReactNode; 
    eventHandlers?: { click?: () => void };
    position?: [number, number];
  }) => (
    <div 
      data-testid="mock-marker" 
      data-lat={position?.[0]} 
      data-lon={position?.[1]}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-popup">{children}</div>
  ),
}));

// Mock react-leaflet-markercluster
vi.mock('react-leaflet-markercluster', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-marker-cluster-group">{children}</div>
  ),
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({})),
    Marker: {
      prototype: {
        options: {},
      },
    },
  },
}));

describe('Map Integration - Placemark Markers', () => {
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    queryClient = createQueryClient();
    useViewStore.setState({ selectedPlacemarkId: null });
    vi.clearAllMocks();
    // Clear global mock handler
    delete (globalThis as any).__mockMoveEndHandler;
  });

  it('fetches and renders placemarks for the initial map viewport', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [
        {
          id: 1,
          name: 'Test Location 1',
          geometry: 'POINT(-115.172281 36.094506)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Test Location 2',
          geometry: 'POINT(-115.142857 36.169941)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.1,
        max_lat: 36.1,
      },
      count: 2,
    };

    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for placemarks to load and render
    await waitFor(
      () => {
        const markers = screen.getAllByTestId('mock-marker');
        expect(markers).toHaveLength(2);
      },
      { timeout: 2000 }
    );

    // Verify API was called with initial bounds
    expect(fetchPlacemarksBBox).toHaveBeenCalled();
    const callArgs = vi.mocked(fetchPlacemarksBBox).mock.calls[0][0];
    expect(callArgs).toMatchObject({
      min_lon: -115.2,
      min_lat: 36.0,
      max_lon: -115.1,
      max_lat: 36.1,
    });

    // Verify markers are rendered with correct content
    expect(screen.getByText('Test Location 1')).toBeInTheDocument();
    expect(screen.getByText('Test Location 2')).toBeInTheDocument();
  });

  it('updates store when a marker is clicked', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [
        {
          id: 123,
          name: 'Clickable Location',
          geometry: 'POINT(-115.172281 36.094506)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.1,
        max_lat: 36.1,
      },
      count: 1,
    };

    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for marker to render
    await waitFor(
      () => {
        expect(screen.getByTestId('mock-marker')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Click the marker
    const marker = screen.getByTestId('mock-marker');
    marker.click();

    // Verify store was updated
    await waitFor(() => {
      const selectedId = useViewStore.getState().selectedPlacemarkId;
      expect(selectedId).toBe(123);
    });
  });

  it('renders no duplicate markers for the same placemarks', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [
        {
          id: 1,
          name: 'Location 1',
          geometry: 'POINT(-115.172281 36.094506)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Location 2',
          geometry: 'POINT(-115.142857 36.169941)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.1,
        max_lat: 36.1,
      },
      count: 2,
    };

    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for markers to render
    await waitFor(
      () => {
        const markers = screen.getAllByTestId('mock-marker');
        expect(markers).toHaveLength(2);
      },
      { timeout: 2000 }
    );

    // Verify each marker is rendered exactly once
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
    
    // Verify unique coordinates
    const coords = markers.map(m => ({
      lat: m.getAttribute('data-lat'),
      lon: m.getAttribute('data-lon'),
    }));
    expect(coords).toHaveLength(2);
    expect(coords[0]).not.toEqual(coords[1]);
  });

  it('does not render markers with invalid geometry', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [
        {
          id: 1,
          name: 'Valid Location',
          geometry: 'POINT(-115.172281 36.094506)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Invalid Geometry',
          geometry: 'INVALID',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 3,
          name: 'Another Valid',
          geometry: 'POINT(-115.142857 36.169941)',
          geometry_type: 'Point',
          folder_path: ['Test'],
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.1,
        max_lat: 36.1,
      },
      count: 3,
    };

    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for markers to render
    await waitFor(
      () => {
        const markers = screen.getAllByTestId('mock-marker');
        expect(markers.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    // Verify only valid markers are rendered (2 out of 3)
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
    expect(screen.getByText('Valid Location')).toBeInTheDocument();
    expect(screen.getByText('Another Valid')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Geometry')).not.toBeInTheDocument();
  });

  it('handles empty placemark response gracefully', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [],
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.1,
        max_lat: 36.1,
      },
      count: 0,
    };

    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for query to complete
    await waitFor(
      () => {
        expect(fetchPlacemarksBBox).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify no markers are rendered
    const markers = screen.queryAllByTestId('mock-marker');
    expect(markers).toHaveLength(0);
  });

  it('handles bbox API errors gracefully and keeps map usable', async () => {
    // Mock API error for the initial fetch
    const errorMessage = 'Failed to fetch placemarks by bbox';
    vi.mocked(fetchPlacemarksBBox).mockRejectedValue(new Error(errorMessage));

    render(
      <QueryClientProvider client={queryClient}>
        <Map />
      </QueryClientProvider>
    );

    // Wait for the API to be called
    await waitFor(
      () => {
        expect(fetchPlacemarksBBox).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify the map container still exists and is rendered (map remains usable)
    expect(screen.getByTestId('mock-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tile-layer')).toBeInTheDocument();

    // Verify no markers are rendered due to the error
    const markers = screen.queryAllByTestId('mock-marker');
    expect(markers).toHaveLength(0);

    // The map should remain interactive - no error should break the UI
    // This verifies that the error is handled non-blockingly as per acceptance criteria
  });
});
