import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlacemarkMarkers } from '../components/PlacemarkMarkers';
import type { Placemark } from '../types/api';
import { useViewStore } from '../lib/store';
import { DefaultMarkerIcon, SelectedIcon } from '../components/Map';

// Mock react-leaflet components
const mockMarkerInstances: Array<{
  position: [number, number];
  icon: typeof DefaultMarkerIcon | typeof SelectedIcon;
  placemarkId: number;
}> = [];

vi.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers, position, icon }: { 
    children?: React.ReactNode; 
    eventHandlers?: { click?: () => void };
    position?: [number, number];
    icon?: typeof DefaultMarkerIcon | typeof SelectedIcon;
  }) => {
    // Track marker instances for assertions
    const key = position ? `${position[0]},${position[1]}` : 'unknown';
    
    return (
      <div 
        data-testid="mock-marker" 
        data-lat={position?.[0]} 
        data-lon={position?.[1]}
        data-icon={icon === SelectedIcon ? 'selected' : 'default'}
        data-key={key}
        onClick={eventHandlers?.click}
      >
        {children}
      </div>
    );
  },
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
    divIcon: vi.fn(() => ({})),
    Marker: {
      prototype: {
        options: {},
      },
    },
  },
}));

describe('PlacemarkMarkers - Marker Highlighting', () => {
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
    {
      id: 3,
      name: 'Test Placemark 3',
      geometry: 'POINT(-115.155 36.180)',
      geometry_type: 'Point',
      folder_path: [],
      created_at: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockMarkerInstances.length = 0;
    useViewStore.setState({ selectedPlacemarkId: null });
  });

  it('renders all markers with default icon when nothing is selected', () => {
    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(3);
    
    // All markers should have default icon
    markers.forEach(marker => {
      expect(marker.getAttribute('data-icon')).toBe('default');
    });
  });

  it('highlights the selected marker with selected icon', () => {
    // Select placemark 2
    useViewStore.setState({ selectedPlacemarkId: 2 });
    
    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(3);
    
    // Check each marker's icon
    const marker1 = markers.find(m => m.getAttribute('data-lat') === '36.094506');
    const marker2 = markers.find(m => m.getAttribute('data-lat') === '36.169941');
    const marker3 = markers.find(m => m.getAttribute('data-lat') === '36.180');
    
    expect(marker1?.getAttribute('data-icon')).toBe('default');
    expect(marker2?.getAttribute('data-icon')).toBe('selected'); // Selected
    expect(marker3?.getAttribute('data-icon')).toBe('default');
  });

  it('updates marker icon when selection changes', () => {
    // Initially select placemark 1
    useViewStore.setState({ selectedPlacemarkId: 1 });
    
    const { rerender } = render(<PlacemarkMarkers placemarks={placemarks} />);
    
    let markers = screen.getAllByTestId('mock-marker');
    let marker1 = markers.find(m => m.getAttribute('data-lat') === '36.094506');
    let marker2 = markers.find(m => m.getAttribute('data-lat') === '36.169941');
    
    expect(marker1?.getAttribute('data-icon')).toBe('selected');
    expect(marker2?.getAttribute('data-icon')).toBe('default');
    
    // Change selection to placemark 2
    useViewStore.setState({ selectedPlacemarkId: 2 });
    rerender(<PlacemarkMarkers placemarks={placemarks} />);
    
    markers = screen.getAllByTestId('mock-marker');
    marker1 = markers.find(m => m.getAttribute('data-lat') === '36.094506');
    marker2 = markers.find(m => m.getAttribute('data-lat') === '36.169941');
    
    // Icon should have switched
    expect(marker1?.getAttribute('data-icon')).toBe('default');
    expect(marker2?.getAttribute('data-icon')).toBe('selected');
  });

  it('reverts to default icon when selection is cleared', () => {
    // Select placemark 2
    useViewStore.setState({ selectedPlacemarkId: 2 });
    
    const { rerender } = render(<PlacemarkMarkers placemarks={placemarks} />);
    
    let markers = screen.getAllByTestId('mock-marker');
    let marker2 = markers.find(m => m.getAttribute('data-lat') === '36.169941');
    expect(marker2?.getAttribute('data-icon')).toBe('selected');
    
    // Clear selection
    useViewStore.setState({ selectedPlacemarkId: null });
    rerender(<PlacemarkMarkers placemarks={placemarks} />);
    
    markers = screen.getAllByTestId('mock-marker');
    marker2 = markers.find(m => m.getAttribute('data-lat') === '36.169941');
    
    // Should revert to default
    expect(marker2?.getAttribute('data-icon')).toBe('default');
  });

  it('only highlights one marker at a time', () => {
    // Select placemark 2
    useViewStore.setState({ selectedPlacemarkId: 2 });
    
    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    const selectedMarkers = markers.filter(m => m.getAttribute('data-icon') === 'selected');
    
    // Only one marker should be selected
    expect(selectedMarkers).toHaveLength(1);
    expect(selectedMarkers[0].getAttribute('data-lat')).toBe('36.169941');
  });

  it('clicking a marker updates the selection and highlights it', () => {
    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    const marker3 = markers.find(m => m.getAttribute('data-lat') === '36.180');
    
    // Initially no marker is selected
    expect(useViewStore.getState().selectedPlacemarkId).toBeNull();
    
    // Click marker 3
    marker3?.click();
    
    // Selection should be updated
    expect(useViewStore.getState().selectedPlacemarkId).toBe(3);
  });

  it('handles selection of non-existent placemark gracefully', () => {
    // Select a placemark that doesn't exist in the list
    useViewStore.setState({ selectedPlacemarkId: 999 });
    
    render(<PlacemarkMarkers placemarks={placemarks} />);
    
    const markers = screen.getAllByTestId('mock-marker');
    
    // All markers should have default icon (no highlight)
    markers.forEach(marker => {
      expect(marker.getAttribute('data-icon')).toBe('default');
    });
  });
});
