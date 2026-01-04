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

describe('PlacemarkMarkers', () => {
  beforeEach(() => {
    // Reset store before each test
    useViewStore.setState({ selectedPlacemarkId: null });
  });

  it('renders no markers when placemarks array is empty', () => {
    render(<PlacemarkMarkers placemarks={[]} />);
    const markers = screen.queryAllByTestId('mock-marker');
    expect(markers).toHaveLength(0);
  });

  it('renders markers for valid POINT geometry placemarks', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark 1',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Test Placemark 2',
        geometry: 'POINT(-115.142857 36.169941)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
  });

  it('renders markers with correct coordinates (lat, lon order)', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark',
        geometry: 'POINT(-115.172281 36.094506)', // WKT format: lon lat
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const marker = screen.getByTestId('mock-marker');
    
    // Leaflet uses [lat, lon] order
    expect(marker).toHaveAttribute('data-lat', '36.094506');
    expect(marker).toHaveAttribute('data-lon', '-115.172281');
  });

  it('uses placemark ID as key (no key warnings)', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Placemark 1',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Test Placemark 2',
        geometry: 'POINT(-115.142857 36.169941)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    // Rendering multiple times should not cause duplicate key warnings
    const { rerender } = render(<PlacemarkMarkers placemarks={placemarks} />);
    rerender(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
  });

  it('calls selectPlacemark when marker is clicked', () => {
    const placemarks: Placemark[] = [
      {
        id: 123,
        name: 'Test Placemark',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const marker = screen.getByTestId('mock-marker');
    
    // Click the marker
    marker.click();
    
    // Check that the store was updated
    const selectedId = useViewStore.getState().selectedPlacemarkId;
    expect(selectedId).toBe(123);
  });

  it('renders popup with placemark name', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Important Location',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    expect(screen.getByText('Important Location')).toBeInTheDocument();
  });

  it('renders popup with description when provided', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test Location',
        description: 'This is a test description',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('skips placemarks with invalid geometry', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Valid Placemark',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Invalid Placemark',
        geometry: 'INVALID_GEOMETRY',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 3,
        name: 'Another Valid',
        geometry: 'POINT(-115.142857 36.169941)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const markers = screen.getAllByTestId('mock-marker');
    
    // Should only render 2 markers (skipping the invalid one)
    expect(markers).toHaveLength(2);
    expect(screen.getByText('Valid Placemark')).toBeInTheDocument();
    expect(screen.getByText('Another Valid')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Placemark')).not.toBeInTheDocument();
  });

  it('handles POINT geometry with various whitespace', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Test 1',
        geometry: 'POINT(-115.172281   36.094506)', // Multiple spaces
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Test 2',
        geometry: 'POINT( -115.142857 36.169941 )', // Spaces around coords
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
  });

  it('handles case-insensitive POINT geometry', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'Lowercase',
        geometry: 'point(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Mixed Case',
        geometry: 'Point(-115.142857 36.169941)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
  });

  it('does not render markers for non-POINT geometry types', () => {
    const placemarks: Placemark[] = [
      {
        id: 1,
        name: 'LineString',
        geometry: 'LINESTRING(-115.1 36.1, -115.2 36.2)',
        geometry_type: 'LineString',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'Polygon',
        geometry: 'POLYGON((-115.1 36.1, -115.2 36.1, -115.2 36.2, -115.1 36.2, -115.1 36.1))',
        geometry_type: 'Polygon',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    render(<PlacemarkMarkers placemarks={placemarks} />);
    const markers = screen.queryAllByTestId('mock-marker');
    
    // Should not render markers for non-POINT geometries
    expect(markers).toHaveLength(0);
  });

  it('updates when placemarks prop changes', () => {
    const placemarks1: Placemark[] = [
      {
        id: 1,
        name: 'First Set',
        geometry: 'POINT(-115.172281 36.094506)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    const placemarks2: Placemark[] = [
      {
        id: 2,
        name: 'Second Set',
        geometry: 'POINT(-115.142857 36.169941)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 3,
        name: 'Third',
        geometry: 'POINT(-115.155 36.180)',
        geometry_type: 'Point',
        folder_path: [],
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    const { rerender } = render(<PlacemarkMarkers placemarks={placemarks1} />);
    expect(screen.getAllByTestId('mock-marker')).toHaveLength(1);
    expect(screen.getByText('First Set')).toBeInTheDocument();

    rerender(<PlacemarkMarkers placemarks={placemarks2} />);
    expect(screen.getAllByTestId('mock-marker')).toHaveLength(2);
    expect(screen.getByText('Second Set')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.queryByText('First Set')).not.toBeInTheDocument();
  });
});
