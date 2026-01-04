import { create } from 'zustand';
import type { PlacemarkDetail } from '../types/api';

/**
 * Valid view modes for the application.
 * - 'timeline': Timeline-only view
 * - 'map': Map-only view
 * - 'split': Split view showing both timeline and map
 */
export type ViewMode = 'timeline' | 'map' | 'split';

/**
 * State shape for the view store.
 */
interface ViewState {
  /** Currently selected placemark ID, or null if no selection */
  selectedPlacemarkId: number | null;
  /** Current view mode for the application */
  viewMode: ViewMode;
  /** Cache of placemark details keyed by placemark ID */
  detailCache: Map<number, PlacemarkDetail>;
  /** Currently selected folder for filtering timeline events, or null for all folders */
  selectedFolder: string | null;
  /** Search text for filtering timeline events by name/description */
  searchText: string;
  /** Start of time range filter for timeline events, or null for no start filter */
  timeRangeStart: string | null;
  /** End of time range filter for timeline events, or null for no end filter */
  timeRangeEnd: string | null;
  /** Whether to include events with null timestamps when time range filter is active */
  includeNullTimestamps: boolean;
}

/**
 * Actions available in the view store.
 */
interface ViewActions {
  /** Select a placemark by ID, or pass null to clear selection */
  selectPlacemark: (id: number | null) => void;
  /** Set the current view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Cache placemark detail data for a given ID */
  cacheDetail: (id: number, data: PlacemarkDetail) => void;
  /** Set the selected folder for filtering, or pass null to clear filter */
  setSelectedFolder: (folder: string | null) => void;
  /** Set the search text for filtering */
  setSearchText: (text: string) => void;
  /** Set the time range filter for timeline events, pass null for either to clear that bound */
  setTimeRange: (start: string | null, end: string | null) => void;
  /** Set whether to include events with null timestamps when time range filter is active */
  setIncludeNullTimestamps: (include: boolean) => void;
}

/**
 * Combined type for the view store including state and actions.
 */
export type ViewStore = ViewState & ViewActions;

/**
 * Zustand store for managing shared view state across timeline and map components.
 * 
 * @example
 * ```typescript
 * // Select a placemark
 * const { selectPlacemark } = useViewStore();
 * selectPlacemark(123);
 * 
 * // Read selected placemark in another component
 * const selectedId = useViewStore((state) => state.selectedPlacemarkId);
 * 
 * // Change view mode
 * const { setViewMode } = useViewStore();
 * setViewMode('split');
 * ```
 */
export const useViewStore = create<ViewStore>((set) => ({
  // Initial state
  selectedPlacemarkId: null,
  viewMode: 'timeline',
  detailCache: new Map(),
  selectedFolder: null,
  searchText: '',
  timeRangeStart: null,
  timeRangeEnd: null,
  includeNullTimestamps: true,

  // Actions
  selectPlacemark: (id) => set({ selectedPlacemarkId: id }),
  setViewMode: (mode) => {
    // Runtime validation to ensure valid ViewMode values
    const validModes: ViewMode[] = ['timeline', 'map', 'split'];
    if (!validModes.includes(mode)) {
      console.error(`Invalid view mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
      return;
    }
    set({ viewMode: mode });
  },
  cacheDetail: (id, data) =>
    set((state) => {
      // Create a new Map to ensure Zustand detects the change for reactivity.
      // This immutable update pattern is necessary for Zustand's shallow comparison.
      const newCache = new Map(state.detailCache);
      newCache.set(id, data);
      return { detailCache: newCache };
    }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setSearchText: (text) => set({ searchText: text }),
  setTimeRange: (start, end) => set({ timeRangeStart: start, timeRangeEnd: end }),
  setIncludeNullTimestamps: (include) => set({ includeNullTimestamps: include }),
}));

// Selectors for convenient access

/**
 * Selector to get the currently selected placemark ID.
 */
export const selectSelectedPlacemarkId = (state: ViewStore) => state.selectedPlacemarkId;

/**
 * Selector to get the current view mode.
 */
export const selectViewMode = (state: ViewStore) => state.viewMode;

/**
 * Selector to get the currently selected folder for filtering.
 */
export const selectSelectedFolder = (state: ViewStore) => state.selectedFolder;

/**
 * Selector to get the entire detail cache.
 */
export const selectDetailCache = (state: ViewStore) => state.detailCache;

/**
 * Selector factory to get a specific cached detail by ID.
 * @param id - The placemark ID to retrieve from cache
 * @returns A selector function that retrieves the cached detail
 */
export const selectCachedDetail = (id: number) => (state: ViewStore) => 
  state.detailCache.get(id);

/**
 * Selector to get the current search text for filtering.
 */
export const selectSearchText = (state: ViewStore) => state.searchText;
