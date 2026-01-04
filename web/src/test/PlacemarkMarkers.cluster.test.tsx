import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlacemarkMarkers } from '../components/PlacemarkMarkers';
import type { Placemark } from '../types/api';
import { useViewStore } from '../lib/store';

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers, position }: { 
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
  default: ({ children, maxClusterRadius, spiderfyOnMaxZoom, showCoverageOnHover, zoomToBoundsOnClick }: { 
    children?: React.ReactNode;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
  }) => (
    <div 
      data-testid="mock-marker-cluster-group"
      data-max-cluster-radius={maxClusterRadius}
      data-spiderfy-on-max-zoom={spiderfyOnMaxZoom}
      data-show-coverage-on-hover={showCoverageOnHover}
      data-zoom-to-bounds-on-click={zoomToBoundsOnClick}
    >
      {children}
    </div>
  ),
}));

describe('PlacemarkMarkers - Clustering', () => {
  beforeEach(() => {
    // Reset store before each test
    useViewStore.setState({ selectedPlacemarkId: null });
  });

  it('wraps markers in a MarkerClusterGroup', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark 1',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    // Verify MarkerClusterGroup is present
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toBeInTheDocument();
  });

  it('configures cluster radius correctly', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toHaveAttribute('data-max-cluster-radius', '60');
  });

  it('enables spiderfy on max zoom', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toHaveAttribute('data-spiderfy-on-max-zoom', 'true');
  });

  it('enables zoom to bounds on cluster click', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toHaveAttribute('data-zoom-to-bounds-on-click', 'true');
  });

  it('renders multiple close markers within cluster group', () => {
    // Create multiple placemarks close together (within 60 pixel radius at typical zoom)
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Marker 1',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Marker 2',
        geometry: 'POINT(-115.172300 36.094520)', // Very close to marker 1
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 3,
        name: 'Marker 3',
        geometry: 'POINT(-115.172320 36.094530)', // Very close to markers 1 & 2
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    // Verify cluster group is present
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toBeInTheDocument();
    
    // Verify all markers are rendered (clustering library will handle grouping)
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(3);
  });

  it('marker click still updates selection store with clustering', () => {
    const placemarks: Placemark[] = [
      {
        id: 123,
        name: 'Clickable Marker',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const marker = screen.getByTestId('mock-marker');
    marker.click();
    
    // Check that the store was updated
    const selectedId = useViewStore.getState().selectedPlacemarkId;
    expect(selectedId).toBe(123);
  });

  it('renders empty cluster group when no placemarks', () => {
    render(<PlacemarkMarkers placemarks={[]} />);
    
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toBeInTheDocument();
    
    const markers = screen.queryAllByTestId('mock-marker');
    expect(markers).toHaveLength(0);
  });

  it('filters invalid geometries within cluster group', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Valid Marker',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Invalid Marker',
        geometry: 'INVALID_GEOMETRY',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    // Cluster group should still be present
    const clusterGroup = screen.getByTestId('mock-marker-cluster-group');
    expect(clusterGroup).toBeInTheDocument();
    
    // Only valid marker should be rendered
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(1);
    expect(screen.getByText('Valid Marker')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Marker')).not.toBeInTheDocument();
  });
});
