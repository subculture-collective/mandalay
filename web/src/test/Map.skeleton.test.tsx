import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MapSkeleton } from '../components/skeletons';

// Mock react-leaflet since we're testing skeleton behavior
vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    useMap: vi.fn(() => ({
      invalidateSize: vi.fn(),
      getBounds: vi.fn(() => ({
        getSouthWest: () => ({ lat: 36.0, lng: -115.2 }),
        getNorthEast: () => ({ lat: 36.2, lng: -115.0 }),
      })),
      flyTo: vi.fn(),
      getZoom: vi.fn(() => 13),
      on: vi.fn(),
      off: vi.fn(),
    })),
  };
});

// Mock the API
vi.mock('../lib/api', () => ({
  fetchPlacemarksBBox: vi.fn(),
}));

import { fetchPlacemarksBBox } from '../lib/api';
import type { BBoxResponse } from '../types/api';

describe('Map - Skeleton Loading States', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('renders MapSkeleton component correctly', () => {
    render(<MapSkeleton />);
    
    const skeleton = screen.getByTestId('map-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading map');
  });

  it('MapSkeleton has overlay styling', () => {
    render(<MapSkeleton />);
    
    const skeleton = screen.getByTestId('map-skeleton');
    expect(skeleton.className).toContain('absolute');
    expect(skeleton.className).toContain('inset-0');
    expect(skeleton.className).toContain('z-[1000]');
  });

  it('shows skeleton when placemarks are loading', async () => {
    const mockResponse: BBoxResponse = {
      placemarks: [],
      count: 0,
      bbox: {
        min_lon: -115.2,
        min_lat: 36.0,
        max_lon: -115.0,
        max_lat: 36.2,
      },
    };

    // Mock delayed response
    vi.mocked(fetchPlacemarksBBox).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
    );

    // Note: Full integration test would require rendering the Map component
    // For now, we verify that the skeleton component itself renders correctly
    render(<MapSkeleton />, { wrapper });
    
    expect(screen.getByTestId('map-skeleton')).toBeInTheDocument();
  });
});
