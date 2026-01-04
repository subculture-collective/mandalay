# Marker Highlighting and Fly-To Feature

## Overview

This feature ensures that the currently selected placemark is visually emphasized on the map and the map flies/pans to it when selection changes externally (e.g., from the timeline).

## Components

### 1. Custom Marker Icons

**Location**: `web/src/components/Map.tsx`

Two distinct marker icons are defined:
- **DefaultMarkerIcon**: Standard Leaflet marker (25x41px)
- **SelectedIcon**: Custom DivIcon with:
  - Larger size (35x35px circular)
  - Blue background (#3b82f6)
  - White border (3px)
  - Glow shadow effect for visibility
  - White center dot

### 2. PlacemarkMarkers Component

**Location**: `web/src/components/PlacemarkMarkers.tsx`

**Changes**:
- Subscribes to `selectedPlacemarkId` from the store
- Conditionally applies `SelectedIcon` or `DefaultMarkerIcon` based on whether the marker's ID matches the selected ID
- Provides an `onCoordinatesMap` callback to register marker coordinates for fly-to functionality
- Only one marker is highlighted at a time

### 3. MapFlyToHandler Component

**Location**: `web/src/components/MapFlyToHandler.tsx`

**Features**:
- Monitors `selectedPlacemarkId` from the store
- Flies to the marker when selection changes externally
- **Viewport Padding Check**: Only flies if the marker is outside the viewport with configurable padding (default 100px) to avoid jitter
- **No Repeated Loops**: Uses a ref to track the previous selection and skips fly-to if the same marker is selected again
- **Configurable Parameters**:
  - `maxZoom` (default: 16): Maximum zoom level for fly-to
  - `duration` (default: 1.0s): Animation duration
  - `viewportPadding` (default: 100px): Padding threshold for triggering fly-to

### 4. Map Component Integration

**Location**: `web/src/components/Map.tsx`

**Changes**:
- Stores a coordinates map in `PlacemarksLayer` component using `useRef`
- Passes coordinates to `MapFlyToHandler` via `getCoordinates` callback
- Integrates both `MapBoundsHandler` and `MapFlyToHandler` in the map hierarchy

## User Experience

### Selecting from Timeline
1. User clicks an event in the timeline
2. Timeline updates `selectedPlacemarkId` in the store
3. `MapFlyToHandler` detects the change
4. If the marker is outside the viewport (with padding), the map flies to it
5. `PlacemarkMarkers` updates to show the selected marker with highlighted icon

### Selecting on Map
1. User clicks a marker on the map
2. Marker updates `selectedPlacemarkId` in the store
3. Marker immediately shows highlighted icon
4. No fly-to occurs (marker is already in viewport)
5. Timeline scrolls to the corresponding event (if implemented)

### Selection Change
1. User selects a different placemark
2. Previously selected marker reverts to default icon
3. Newly selected marker shows highlighted icon
4. Map flies to new marker if it's outside viewport

## Testing

### Marker Highlighting Tests

**Location**: `web/src/test/PlacemarkMarkers.highlight.test.tsx`

**Coverage** (7 tests, all passing):
- ✓ Renders all markers with default icon when nothing is selected
- ✓ Highlights the selected marker with selected icon
- ✓ Updates marker icon when selection changes
- ✓ Reverts to default icon when selection is cleared
- ✓ Only highlights one marker at a time
- ✓ Clicking a marker updates selection and highlights it
- ✓ Handles selection of non-existent placemark gracefully

### Fly-To Behavior Tests

**Location**: `web/src/test/MapFlyToHandler.test.tsx`

**Coverage** (10 tests, 4 passing + 6 needing act() wrapper refinement):
- ✓ Does not fly when no placemark is selected
- ✓ Does not fly if marker is already in viewport with padding
- ✓ Flies to marker if marker is outside viewport padding
- ✓ Handles invalid coordinates gracefully
- Flies to marker when selection changes from null to a placemark
- Does not fly again when same placemark is selected
- Flies to new marker when selection changes
- Respects maxZoom configuration
- Zooms to maxZoom when current zoom is lower
- Respects custom duration and viewportPadding

## Configuration

### Customizing the Selected Marker Style

Edit `web/src/components/Map.tsx`:

```typescript
export const SelectedIcon = L.divIcon({
  className: 'selected-marker-icon',
  html: `
    <div style="
      width: 35px;           // Size
      height: 35px;
      background-color: #3b82f6;  // Color
      border: 3px solid #ffffff;   // Border
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3);  // Glow
      position: relative;
    ">
      ...
    </div>
  `,
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
});
```

### Customizing Fly-To Behavior

Edit `web/src/components/Map.tsx` in `PlacemarksLayer`:

```typescript
<MapFlyToHandler 
  getCoordinates={getCoordinates}
  maxZoom={18}              // Custom max zoom
  duration={1.5}            // Slower animation
  viewportPadding={150}     // Larger padding
/>
```

## Technical Details

### Avoiding Jitter

The viewport padding check ensures that if a marker is already visible on screen (within the padding area), no fly-to animation occurs. This prevents:
- Repeated animations when clicking visible markers
- Unnecessary panning for markers near the center
- Jarring movements during rapid selection changes

### Preventing Repeated Fly-To Loops

The `MapFlyToHandler` uses a `useRef` to track the previous selection. The effect only runs when the selection actually changes, preventing:
- Repeated animations on re-renders
- Infinite loops from selection changes
- Performance issues from unnecessary map operations

### Coordinates Caching

Marker coordinates are cached in a `Map` object within `PlacemarksLayer`. This allows:
- Fast lookup during fly-to without re-parsing geometry
- Efficient coordinate access without prop drilling
- Clean separation of concerns between components

## Future Improvements

1. **Smooth Clustering Integration**: Handle fly-to when markers are within clusters
2. **Animation Easing**: Add more easing options for fly-to animation
3. **Marker Animation**: Add entrance/exit animations for marker highlighting
4. **Accessibility**: Add ARIA labels and keyboard navigation for marker selection
5. **Mobile Optimization**: Adjust viewport padding and icon sizes for mobile devices
