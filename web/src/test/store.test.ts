import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewStore, selectSelectedPlacemarkId, selectViewMode, selectDetailCache, selectCachedDetail } from '../lib/store';
import type { PlacemarkDetail } from '../types/api';

// Shared mock data
const mockPlacemarkDetail: PlacemarkDetail = {
  id: 123,
  name: 'Test Placemark',
  description: 'This is a test placemark',
  style_id: 'icon-1538-0288D1',
  folder_path: ['Test Folder'],
  timestamp: '2017-10-01T21:41:56Z',
  location: {
    type: 'Point',
    coordinates: [-115.172281, 36.094506],
  },
  media_links: ['https://youtube.com/watch?v=test123'],
};

describe('useViewStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useViewStore.setState({
      selectedPlacemarkId: null,
      viewMode: 'timeline',
      detailCache: new Map(),
    });
  });

  describe('initial state', () => {
    it('initializes with null selectedPlacemarkId', () => {
      const state = useViewStore.getState();
      expect(state.selectedPlacemarkId).toBeNull();
    });

    it('initializes with default viewMode as timeline', () => {
      const state = useViewStore.getState();
      expect(state.viewMode).toBe('timeline');
    });

    it('initializes with empty detailCache', () => {
      const state = useViewStore.getState();
      expect(state.detailCache.size).toBe(0);
    });
  });

  describe('selectPlacemark', () => {
    it('updates selectedPlacemarkId with a valid id', () => {
      const state = useViewStore.getState();
      state.selectPlacemark(123);
      
      expect(useViewStore.getState().selectedPlacemarkId).toBe(123);
    });

    it('updates selectedPlacemarkId to null', () => {
      const state = useViewStore.getState();
      state.selectPlacemark(123);
      expect(useViewStore.getState().selectedPlacemarkId).toBe(123);
      
      state.selectPlacemark(null);
      expect(useViewStore.getState().selectedPlacemarkId).toBeNull();
    });

    it('can change from one id to another', () => {
      const state = useViewStore.getState();
      state.selectPlacemark(123);
      expect(useViewStore.getState().selectedPlacemarkId).toBe(123);
      
      state.selectPlacemark(456);
      expect(useViewStore.getState().selectedPlacemarkId).toBe(456);
    });

    it('does not affect other state properties', () => {
      const state = useViewStore.getState();
      state.setViewMode('map');
      state.selectPlacemark(123);
      
      const newState = useViewStore.getState();
      expect(newState.selectedPlacemarkId).toBe(123);
      expect(newState.viewMode).toBe('map');
    });
  });

  describe('setViewMode', () => {
    it('sets viewMode to timeline', () => {
      const state = useViewStore.getState();
      state.setViewMode('timeline');
      
      expect(useViewStore.getState().viewMode).toBe('timeline');
    });

    it('sets viewMode to map', () => {
      const state = useViewStore.getState();
      state.setViewMode('map');
      
      expect(useViewStore.getState().viewMode).toBe('map');
    });

    it('sets viewMode to split', () => {
      const state = useViewStore.getState();
      state.setViewMode('split');
      
      expect(useViewStore.getState().viewMode).toBe('split');
    });

    it('can toggle between different modes', () => {
      const state = useViewStore.getState();
      
      state.setViewMode('map');
      expect(useViewStore.getState().viewMode).toBe('map');
      
      state.setViewMode('split');
      expect(useViewStore.getState().viewMode).toBe('split');
      
      state.setViewMode('timeline');
      expect(useViewStore.getState().viewMode).toBe('timeline');
    });

    it('does not affect other state properties', () => {
      const state = useViewStore.getState();
      state.selectPlacemark(123);
      state.setViewMode('map');
      
      const newState = useViewStore.getState();
      expect(newState.viewMode).toBe('map');
      expect(newState.selectedPlacemarkId).toBe(123);
    });

    it('rejects invalid view mode values with runtime validation', () => {
      const state = useViewStore.getState();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Set initial valid mode
      state.setViewMode('map');
      expect(useViewStore.getState().viewMode).toBe('map');
      
      // Try to set invalid mode - should log error and not change state
      // @ts-expect-error Testing runtime validation with invalid value
      state.setViewMode('invalid');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid view mode: invalid')
      );
      expect(useViewStore.getState().viewMode).toBe('map'); // Should remain 'map'
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cacheDetail', () => {
    it('caches placemark detail data', () => {
      const state = useViewStore.getState();
      state.cacheDetail(123, mockPlacemarkDetail);
      
      const cached = useViewStore.getState().detailCache.get(123);
      expect(cached).toEqual(mockPlacemarkDetail);
    });

    it('caches multiple placemark details', () => {
      const mockPlacemark2: PlacemarkDetail = {
        ...mockPlacemarkDetail,
        id: 456,
        name: 'Another Placemark',
      };

      const state = useViewStore.getState();
      state.cacheDetail(123, mockPlacemarkDetail);
      state.cacheDetail(456, mockPlacemark2);
      
      const cache = useViewStore.getState().detailCache;
      expect(cache.size).toBe(2);
      expect(cache.get(123)).toEqual(mockPlacemarkDetail);
      expect(cache.get(456)).toEqual(mockPlacemark2);
    });

    it('updates existing cached data', () => {
      const updatedPlacemark: PlacemarkDetail = {
        ...mockPlacemarkDetail,
        name: 'Updated Name',
      };

      const state = useViewStore.getState();
      state.cacheDetail(123, mockPlacemarkDetail);
      expect(useViewStore.getState().detailCache.get(123)?.name).toBe('Test Placemark');
      
      state.cacheDetail(123, updatedPlacemark);
      expect(useViewStore.getState().detailCache.get(123)?.name).toBe('Updated Name');
    });

    it('does not affect other state properties', () => {
      const state = useViewStore.getState();
      state.selectPlacemark(123);
      state.setViewMode('map');
      state.cacheDetail(123, mockPlacemarkDetail);
      
      const newState = useViewStore.getState();
      expect(newState.selectedPlacemarkId).toBe(123);
      expect(newState.viewMode).toBe('map');
      expect(newState.detailCache.get(123)).toEqual(mockPlacemarkDetail);
    });
  });

  describe('selectors', () => {
    it('selectSelectedPlacemarkId returns the selected id', () => {
      useViewStore.getState().selectPlacemark(123);
      
      const selectedId = selectSelectedPlacemarkId(useViewStore.getState());
      expect(selectedId).toBe(123);
    });

    it('selectViewMode returns the current view mode', () => {
      useViewStore.getState().setViewMode('split');
      
      const viewMode = selectViewMode(useViewStore.getState());
      expect(viewMode).toBe('split');
    });

    it('selectDetailCache returns the entire cache', () => {
      useViewStore.getState().cacheDetail(123, mockPlacemarkDetail);
      
      const cache = selectDetailCache(useViewStore.getState());
      expect(cache.size).toBe(1);
      expect(cache.get(123)).toEqual(mockPlacemarkDetail);
    });

    it('selectCachedDetail returns a specific cached detail', () => {
      useViewStore.getState().cacheDetail(123, mockPlacemarkDetail);
      
      const detail = selectCachedDetail(123)(useViewStore.getState());
      expect(detail).toEqual(mockPlacemarkDetail);
    });

    it('selectCachedDetail returns undefined for non-existent id', () => {
      const detail = selectCachedDetail(999)(useViewStore.getState());
      expect(detail).toBeUndefined();
    });
  });

  describe('state transitions', () => {
    it('handles complete workflow: select -> cache -> change view', () => {
      const state = useViewStore.getState();
      
      // Select a placemark
      state.selectPlacemark(123);
      expect(useViewStore.getState().selectedPlacemarkId).toBe(123);
      
      // Cache its detail
      state.cacheDetail(123, mockPlacemarkDetail);
      expect(useViewStore.getState().detailCache.get(123)).toEqual(mockPlacemarkDetail);
      
      // Change view mode
      state.setViewMode('map');
      expect(useViewStore.getState().viewMode).toBe('map');
      
      // Verify all states are preserved
      const finalState = useViewStore.getState();
      expect(finalState.selectedPlacemarkId).toBe(123);
      expect(finalState.viewMode).toBe('map');
      expect(finalState.detailCache.get(123)).toEqual(mockPlacemarkDetail);
    });

    it('handles selection from timeline (update store)', () => {
      const state = useViewStore.getState();
      
      // Simulate timeline selecting a placemark
      state.selectPlacemark(123);
      
      // Map should be able to read this selection
      expect(useViewStore.getState().selectedPlacemarkId).toBe(123);
    });

    it('handles selection from map (update store)', () => {
      const state = useViewStore.getState();
      
      // Simulate map selecting a placemark
      state.setViewMode('map');
      state.selectPlacemark(456);
      
      // Timeline should be able to read this selection
      const currentState = useViewStore.getState();
      expect(currentState.selectedPlacemarkId).toBe(456);
      expect(currentState.viewMode).toBe('map');
    });

    it('handles view mode toggle sequence', () => {
      const state = useViewStore.getState();
      
      // Start with timeline (default)
      expect(useViewStore.getState().viewMode).toBe('timeline');
      
      // Toggle to map
      state.setViewMode('map');
      expect(useViewStore.getState().viewMode).toBe('map');
      
      // Toggle to split
      state.setViewMode('split');
      expect(useViewStore.getState().viewMode).toBe('split');
      
      // Toggle back to timeline
      state.setViewMode('timeline');
      expect(useViewStore.getState().viewMode).toBe('timeline');
    });

    it('preserves cache across multiple selections', () => {
      const mockPlacemark2: PlacemarkDetail = {
        ...mockPlacemarkDetail,
        id: 456,
        name: 'Another Placemark',
      };

      const state = useViewStore.getState();
      
      // Select and cache first placemark
      state.selectPlacemark(123);
      state.cacheDetail(123, mockPlacemarkDetail);
      
      // Select and cache second placemark
      state.selectPlacemark(456);
      state.cacheDetail(456, mockPlacemark2);
      
      // Both should be in cache
      const cache = useViewStore.getState().detailCache;
      expect(cache.size).toBe(2);
      expect(cache.get(123)).toEqual(mockPlacemarkDetail);
      expect(cache.get(456)).toEqual(mockPlacemark2);
    });
  });

  describe('setTimeRange', () => {
    it('sets both start and end time range', () => {
      const state = useViewStore.getState();
      state.setTimeRange('2017-10-01T21:00:00', '2017-10-01T22:00:00');
      
      const newState = useViewStore.getState();
      expect(newState.timeRangeStart).toBe('2017-10-01T21:00:00');
      expect(newState.timeRangeEnd).toBe('2017-10-01T22:00:00');
    });

    it('clears time range when both are null', () => {
      const state = useViewStore.getState();
      
      // First set a time range
      state.setTimeRange('2017-10-01T21:00:00', '2017-10-01T22:00:00');
      expect(useViewStore.getState().timeRangeStart).not.toBeNull();
      
      // Then clear it
      state.setTimeRange(null, null);
      const newState = useViewStore.getState();
      expect(newState.timeRangeStart).toBeNull();
      expect(newState.timeRangeEnd).toBeNull();
    });

    it('sets only start time when end is null', () => {
      const state = useViewStore.getState();
      state.setTimeRange('2017-10-01T21:00:00', null);
      
      const newState = useViewStore.getState();
      expect(newState.timeRangeStart).toBe('2017-10-01T21:00:00');
      expect(newState.timeRangeEnd).toBeNull();
    });

    it('sets only end time when start is null', () => {
      const state = useViewStore.getState();
      state.setTimeRange(null, '2017-10-01T22:00:00');
      
      const newState = useViewStore.getState();
      expect(newState.timeRangeStart).toBeNull();
      expect(newState.timeRangeEnd).toBe('2017-10-01T22:00:00');
    });
  });

  describe('setIncludeNullTimestamps', () => {
    it('initializes with includeNullTimestamps as true', () => {
      const state = useViewStore.getState();
      expect(state.includeNullTimestamps).toBe(true);
    });

    it('sets includeNullTimestamps to false', () => {
      const state = useViewStore.getState();
      state.setIncludeNullTimestamps(false);
      
      expect(useViewStore.getState().includeNullTimestamps).toBe(false);
    });

    it('sets includeNullTimestamps to true', () => {
      const state = useViewStore.getState();
      
      // First set to false
      state.setIncludeNullTimestamps(false);
      expect(useViewStore.getState().includeNullTimestamps).toBe(false);
      
      // Then set back to true
      state.setIncludeNullTimestamps(true);
      expect(useViewStore.getState().includeNullTimestamps).toBe(true);
    });
  });
});
