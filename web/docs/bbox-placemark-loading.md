# BBox-Driven Placemark Loading Implementation

## Overview
This document confirms that the bbox-driven placemark loading feature for the map component is **fully implemented** and meets all acceptance criteria specified in the issue.

## Architecture

### Component Flow
```
Map
  └── PlacemarksLayer
        ├── MapBoundsHandler (listens to map events)
        │     └── onBoundsChange(bbox) callback
        ├── usePlacemarksBBox(bbox) hook
        │     ├── Debounces bbox changes (300ms)
        │     └── Calls /api/v1/spatial/bbox
        └── PlacemarkMarkers (renders results)
```

## Implementation Details

### 1. MapBoundsHandler Component
**Location:** `web/src/components/MapBoundsHandler.tsx`

**Responsibilities:**
- Listens to Leaflet `moveend` events (fired after pan/zoom completes)
- Converts Leaflet bounds to bbox format: `{ min_lon, min_lat, max_lon, max_lat }`
- Reports initial bounds on component mount
- Invokes callback when bounds change

**Key Features:**
- Uses `useMapEvents` hook from react-leaflet
- Stable callback reference via useRef to prevent unnecessary re-renders

### 2. usePlacemarksBBox Hook
**Location:** `web/src/lib/usePlacemarksBBox.ts`

**Responsibilities:**
- Debounces bbox changes to prevent API spam
- Fetches placemarks from `/api/v1/spatial/bbox` endpoint
- Manages loading, error, and success states
- Caches results per unique bbox

**Key Features:**
- **Debouncing:** 300ms default (configurable via `debounceMs` option)
  - Only the latest bbox is fetched after rapid changes
  - Previous pending requests are cancelled automatically
- **Caching:** Uses TanStack Query for intelligent caching
  - Same bbox reused from cache
  - 5-minute stale time
  - 10-minute garbage collection time
- **Error Handling:** Non-blocking error state
  - Errors don't crash the UI
  - Map remains usable on error
- **Limit Parameter:** Configurable result limit (default: server default)

### 3. API Integration
**Endpoint:** `GET /api/v1/spatial/bbox`

**Query Parameters:**
- `min_lon` (required): Minimum longitude
- `min_lat` (required): Minimum latitude  
- `max_lon` (required): Maximum longitude
- `max_lat` (required): Maximum latitude
- `limit` (optional): Maximum number of results

**Response Format:**
```typescript
{
  placemarks: Placemark[],
  bbox: BBox,
  count: number
}
```

## Acceptance Criteria ✅

### 1. Debounced Fetch on Pan/Zoom
- ✅ `MapBoundsHandler` listens to `moveend` events
- ✅ `usePlacemarksBBox` debounces bbox changes (300ms default)
- ✅ Only fires after user stops moving the map

### 2. No Request Spam on Rapid Moves
- ✅ Debounce logic cancels intermediate requests
- ✅ Only the latest bbox position triggers a fetch
- ✅ Verified in unit tests (`usePlacemarksBBox.test.tsx`)

### 3. Markers Update with Viewport Results
- ✅ `PlacemarkMarkers` component renders data from hook
- ✅ React automatically re-renders when data changes
- ✅ Old markers are replaced with new viewport results

### 4. Non-Blocking Error Handling
- ✅ TanStack Query handles errors gracefully
- ✅ Map UI remains functional on API failure
- ✅ No crashes or broken states
- ✅ Verified in integration test

## Testing Coverage

### Unit Tests
**File:** `web/src/test/usePlacemarksBBox.test.tsx`

16 tests covering:
- Debouncing rapid bbox changes (only latest value fetched)
- Custom debounce delays
- Error handling at hook level
- Caching behavior
- Enabled/disabled states
- Query key generation

### Integration Tests  
**File:** `web/src/test/Map.integration.test.tsx`

Tests include:
- Initial viewport placemark fetching
- Marker rendering with valid data
- Invalid geometry handling
- Empty response handling
- **NEW:** Error handling test (API failure doesn't break map)

### Component Tests
**File:** `web/src/test/MapBoundsHandler.test.tsx`

Tests include:
- Initial bounds reporting on mount
- moveend event registration
- Bounds change callback invocation

## Performance Considerations

### Debouncing Benefits
- **Reduced Network Load:** Max 1 request per 300ms during pan/zoom
- **Server Protection:** Prevents overwhelming backend during rapid interactions
- **Battery Efficiency:** Fewer requests = less CPU/network activity on mobile

### Caching Benefits
- **Instant Returns:** Previously viewed areas load from cache
- **Reduced Bandwidth:** No redundant fetches for same viewport
- **Offline Resilience:** Cached data available without network

## Configuration

### Debounce Delay
```typescript
const { data } = usePlacemarksBBox(bbox, {
  debounceMs: 500 // Override default 300ms
});
```

### Result Limit
```typescript
const { data } = usePlacemarksBBox(bbox, {
  limit: 50 // Limit results per request
});
```

### Disable Fetching
```typescript
const { data } = usePlacemarksBBox(bbox, {
  enabled: false // Disable automatic fetching
});
```

## Future Enhancements (Out of Scope)

Potential improvements not part of current implementation:
- Progressive loading (fetch in batches)
- Clustering for dense areas
- Preloading adjacent viewports
- WebSocket updates for real-time changes
- Service worker caching for offline support

## Conclusion

The bbox-driven placemark loading feature is **production-ready** and meets all specified requirements. The implementation leverages industry-standard patterns (debouncing, caching, error boundaries) to provide a smooth, performant user experience while protecting backend infrastructure from request spam.
