import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { usePlacemarksBBox } from '../lib/usePlacemarksBBox';
import type { BBoxResponse, BBox } from '../types/api';
import type { ReactNode } from 'react';

// Mock the API
vi.mock('../lib/api', () => ({
  fetchPlacemarksBBox: vi.fn(),
}));

import { fetchPlacemarksBBox } from '../lib/api';

const mockBBox: BBox = {
  min_lon: -115.2,
  min_lat: 36.0,
  max_lon: -115.1,
  max_lat: 36.1,
};

const mockBBoxResponse: BBoxResponse = {
  placemarks: [
    {
      id: 1,
      name: 'Test Placemark',
      coordinates: [-115.15, 36.05],
      style_id: 'test-style',
      folder_path: ['Test Folder'],
    },
  ],
  count: 1,
  bbox_requested: mockBBox,
};

describe('Map - Error Handling and Retry (Hook Level)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a fresh QueryClient with no retries for faster tests
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up query client
    queryClient.clear();
  });

  // Helper to wrap hooks with QueryClientProvider
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('returns error state when bbox fetch fails', async () => {
    // Mock error response
    const errorMessage = 'Failed to fetch placemarks by bbox';
    vi.mocked(fetchPlacemarksBBox).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Wait for error state
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Check error details
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe(errorMessage);
  });

  it('exposes refetch function for retry', async () => {
    // Mock initial error, then success
    vi.mocked(fetchPlacemarksBBox)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Wait for error state
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Verify refetch function exists
    expect(typeof result.current.refetch).toBe('function');

    // Trigger refetch
    await result.current.refetch();

    // Wait for success
    await waitFor(
      () => {
        expect(result.current.isError).toBe(false);
        expect(result.current.data).toBeDefined();
      },
      { timeout: 3000 }
    );

    // Check that data is loaded after retry
    expect(result.current.data).toEqual(mockBBoxResponse);
  });

  it('clears error state after successful retry', async () => {
    // Mock initial error, then success
    vi.mocked(fetchPlacemarksBBox)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Wait for error state
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error?.message).toBe('Network error');

    // Trigger refetch
    await result.current.refetch();

    // Wait for success - error should be cleared
    await waitFor(
      () => {
        expect(result.current.isError).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockBBoxResponse);
  });

  it('handles multiple retry attempts', async () => {
    // Mock multiple errors, then success
    vi.mocked(fetchPlacemarksBBox)
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    // Wait for first error
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('Error 1');
      },
      { timeout: 3000 }
    );

    // First retry
    await result.current.refetch();

    // Wait for second error
    await waitFor(
      () => {
        expect(result.current.error?.message).toBe('Error 2');
      },
      { timeout: 3000 }
    );

    // Second retry
    await result.current.refetch();

    // Wait for success
    await waitFor(
      () => {
        expect(result.current.isError).toBe(false);
        expect(result.current.data).toBeDefined();
      },
      { timeout: 3000 }
    );

    expect(result.current.data).toEqual(mockBBoxResponse);
  });

  it('does not fetch when bbox is null', async () => {
    vi.mocked(fetchPlacemarksBBox).mockResolvedValue(mockBBoxResponse);

    const { result } = renderHook(() => usePlacemarksBBox(null), { wrapper });

    // Should not be loading or have data
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);

    // Should not have called the API
    await waitFor(() => {
      expect(fetchPlacemarksBBox).not.toHaveBeenCalled();
    });
  });

  it('returns all expected properties for error handling', async () => {
    vi.mocked(fetchPlacemarksBBox).mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => usePlacemarksBBox(mockBBox), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    // Check that all expected properties are present
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});
