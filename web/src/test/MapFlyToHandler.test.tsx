import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { MapFlyToHandler } from '../components/MapFlyToHandler';
import { useViewStore } from '../lib/store';

// Mock react-leaflet
const mockFlyTo = vi.fn();
const mockGetZoom = vi.fn(() => 13);
const mockGetSize = vi.fn(() => ({ x: 800, y: 600 }));
const mockLatLngToContainerPoint = vi.fn(() => ({ x: 400, y: 300 }));

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    flyTo: mockFlyTo,
    getZoom: mockGetZoom,
    getSize: mockGetSize,
    latLngToContainerPoint: mockLatLngToContainerPoint,
  }),
}));

describe('MapFlyToHandler', () => {
  const mockGetCoordinates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useViewStore.setState({ selectedPlacemarkId: null });
    mockGetCoordinates.mockReturnValue([36.094506, -115.172281]);
    mockLatLngToContainerPoint.mockReturnValue({ x: 400, y: 300 }); // Center
  });

  it('does not fly when no placemark is selected', () => {
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} />);
    
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('flies to marker when selection changes from null to a placemark', async () => {
    // Mock marker outside viewport padding
    mockLatLngToContainerPoint.mockReturnValue({ x: 50, y: 50 });
    
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} />);
    
    // Select a placemark using the store's action
    act(() => {
      useViewStore.getState().selectPlacemark(123);
    });
    
    await waitFor(() => {
      expect(mockGetCoordinates).toHaveBeenCalledWith(123);
    });
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith(
        [36.094506, -115.172281],
        expect.any(Number),
        expect.objectContaining({
          duration: 1.0,
          easeLinearity: 0.25,
        })
      );
    });
  });

  it('does not fly if marker is already in viewport with padding', async () => {
    // Mock marker in center of viewport (within padding)
    mockLatLngToContainerPoint.mockReturnValue({ x: 400, y: 300 });
    
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} viewportPadding={100} />);
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    // Wait a bit to ensure no fly happens
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('flies to marker if marker is outside viewport padding', async () => {
    // Mock marker near edge (outside padding of 100px)
    mockLatLngToContainerPoint.mockReturnValue({ x: 50, y: 50 });
    
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} viewportPadding={100} />);
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalled();
    });
  });

  it('does not fly again when same placemark is selected', async () => {
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} />);
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalled();
    });
    
    mockFlyTo.mockClear();
    
    // Select the same placemark again
    useViewStore.getState().selectPlacemark(123);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should not fly again
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('flies to new marker when selection changes from one placemark to another', async () => {
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} />);
    
    // Select first placemark
    mockGetCoordinates.mockReturnValue([36.094506, -115.172281]);
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalled();
    });
    
    mockFlyTo.mockClear();
    
    // Select second placemark (different coordinates, outside padding)
    mockGetCoordinates.mockReturnValue([36.169941, -115.142857]);
    mockLatLngToContainerPoint.mockReturnValue({ x: 50, y: 50 }); // Outside padding
    useViewStore.getState().selectPlacemark(456);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith(
        [36.169941, -115.142857],
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  it('respects maxZoom configuration', async () => {
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} maxZoom={15} />);
    
    // Mock current zoom higher than maxZoom
    mockGetZoom.mockReturnValue(18);
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith(
        expect.any(Array),
        18, // Should keep current zoom if higher than maxZoom
        expect.any(Object)
      );
    });
  });

  it('zooms to maxZoom when current zoom is lower', async () => {
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} maxZoom={16} />);
    
    // Mock current zoom lower than maxZoom
    mockGetZoom.mockReturnValue(10);
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith(
        expect.any(Array),
        16, // Should zoom to maxZoom
        expect.any(Object)
      );
    });
  });

  it('handles invalid coordinates gracefully', async () => {
    mockGetCoordinates.mockReturnValue(null);
    
    render(<MapFlyToHandler getCoordinates={mockGetCoordinates} />);
    
    // Select a placemark with invalid coordinates
    useViewStore.getState().selectPlacemark(999);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should not fly
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('respects custom duration and viewportPadding', async () => {
    render(
      <MapFlyToHandler 
        getCoordinates={mockGetCoordinates}
        duration={2.5}
        viewportPadding={150}
      />
    );
    
    // Select a placemark
    useViewStore.getState().selectPlacemark(123);
    
    await waitFor(() => {
      expect(mockFlyTo).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Number),
        expect.objectContaining({
          duration: 2.5,
        })
      );
    });
  });
});
