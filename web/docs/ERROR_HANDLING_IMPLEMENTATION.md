# Error Handling and Retry Implementation Summary

## Overview
This implementation adds consistent error handling with retry functionality to all data-fetching surfaces in the Mandalay application (Timeline events, Map bbox placemarks, and Placemark details).

## Changes Made

### 1. Timeline Component (`web/src/components/Timeline.tsx`)
**Before:**
- Used manual `useState` and `useEffect` for fetching timeline events
- Basic error display without retry functionality
- ~26 lines of fetch logic

**After:**
- Migrated to use existing `useTimelineEvents` hook from react-query
- Added retry button to error state
- Improved error handling with better error messages
- ~9 lines using the hook (simplified code)

**Key Changes:**
```typescript
// Removed manual state management
- const [events, setEvents] = useState<TimelineEvent[]>([]);
- const [loading, setLoading] = useState(true);
- const [error, setError] = useState<string | null>(null);

// Added react-query hook usage
+ const {
+   data: events = [],
+   isLoading: loading,
+   isError: hasError,
+   error: errorObj,
+   refetch: refetchEvents
+ } = useTimelineEvents();
```

**Error UI:**
- Full-screen centered error message
- Red background with icon
- Clear error message text
- Prominent "Retry" button with icon
- Matches existing error UI patterns

### 2. Map Component (`web/src/components/Map.tsx`)
**Changes:**
- Added error handling to `PlacemarksLayer` component
- Error banner positioned absolutely over the map
- Does not break map functionality when error occurs

**Error UI:**
- Floating banner at top of map (position: absolute)
- Red background with border
- Error icon and message
- "Retry" button
- Matches PlacemarkDetail error UI pattern

**Implementation:**
```typescript
const { data, isLoading, isError, error, refetch } = usePlacemarksBBox(bbox);

// Error banner rendered conditionally
{isError && (
  <div style={{ position: 'absolute', top: '10px', ... }}>
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      {/* Error message and retry button */}
    </div>
  </div>
)}
```

### 3. PlacemarkDetail Component
**Status:** Already had proper error handling with retry functionality (lines 289-312).
**No changes needed.**

## Testing

### New Test Files
1. **`web/src/test/Timeline.error-retry.test.tsx`** (6 tests)
   - Displays error message when timeline events fail to load
   - Displays default error message when error has no message
   - Retries fetching timeline events when retry button is clicked
   - Clears error state after successful retry
   - Handles multiple retry attempts
   - Does not break UI when error occurs

2. **`web/src/test/Map.error-retry.test.tsx`** (6 tests, hook-level)
   - Returns error state when bbox fetch fails
   - Exposes refetch function for retry
   - Clears error state after successful retry
   - Handles multiple retry attempts
   - Does not fetch when bbox is null
   - Returns all expected properties for error handling

### Test Results
- ✅ All 12 new tests pass
- ✅ All existing Timeline tests pass (10 tests)
- ✅ All existing hook tests pass (35 tests)
- ✅ No regressions detected

## Technical Implementation

### React Query Features Used
- **Error State:** `isError`, `error` from query hooks
- **Refetch:** `refetch()` function for retry functionality
- **Loading State:** `isLoading` for loading indicators
- **Data State:** `data` with default values

### Error Handling Pattern
All three surfaces now follow the same pattern:
1. Query hook provides error state and refetch function
2. Conditional rendering based on `isError`
3. Error UI with:
   - Icon (alert/warning triangle)
   - Error message (with fallback)
   - Retry button calling `refetch()`
4. Error clears automatically on successful retry

### Benefits
- **Consistent UX:** All fetch errors handled the same way
- **No crashes:** Errors don't break the UI
- **User recovery:** Retry buttons allow users to recover from transient errors
- **Developer experience:** Leveraging react-query's built-in error handling
- **Simplified code:** Removed ~26 lines of manual fetch logic in Timeline

## Acceptance Criteria Met

✅ **Errors surface visibly (toast or inline) for timeline/map/detail fetch failures**
- Timeline: Full-screen error message
- Map: Floating error banner
- Detail: Inline error message (pre-existing)

✅ **Retry triggers the underlying refetch and clears the error when successful**
- All retry buttons call `refetch()` from react-query
- Error state clears automatically on successful retry
- Tested with multiple retry scenarios

✅ **No unhandled promise rejections; errors do not break the UI**
- All errors caught by react-query
- UI remains functional during error states
- Map continues to work with error banner overlay
- Tests verify UI stability

## Files Modified
1. `web/src/components/Timeline.tsx` - Migrated to hook, added retry
2. `web/src/components/Map.tsx` - Added error banner with retry
3. `web/src/test/Timeline.error-retry.test.tsx` - New test file
4. `web/src/test/Map.error-retry.test.tsx` - New test file

## Future Improvements (Out of Scope)
- Toast notification system for non-critical errors
- Error analytics/logging
- Offline detection and specialized messaging
- Exponential backoff for retries
- Error boundary for unexpected errors
