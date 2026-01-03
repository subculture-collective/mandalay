import { create } from 'zustand';
import type { PlacemarkDetail } from '../types/api';

export type ViewMode = 'timeline' | 'map' | 'split';

interface ViewState {
  selectedPlacemarkId: number | null;
  viewMode: ViewMode;
  detailCache: Map<number, PlacemarkDetail>;
}

interface ViewActions {
  selectPlacemark: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  cacheDetail: (id: number, data: PlacemarkDetail) => void;
}

export type ViewStore = ViewState & ViewActions;

export const useViewStore = create<ViewStore>((set) => ({
  // Initial state
  selectedPlacemarkId: null,
  viewMode: 'timeline',
  detailCache: new Map(),

  // Actions
  selectPlacemark: (id) => set({ selectedPlacemarkId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  cacheDetail: (id, data) =>
    set((state) => {
      const newCache = new Map(state.detailCache);
      newCache.set(id, data);
      return { detailCache: newCache };
    }),
}));

// Selectors for convenient access
export const selectSelectedPlacemarkId = (state: ViewStore) => state.selectedPlacemarkId;
export const selectViewMode = (state: ViewStore) => state.viewMode;
export const selectDetailCache = (state: ViewStore) => state.detailCache;
export const selectCachedDetail = (id: number) => (state: ViewStore) => 
  state.detailCache.get(id);
