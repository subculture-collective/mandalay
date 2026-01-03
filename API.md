# Mandalay API Documentation

Base URL: `http://localhost:8080`

## Endpoints

### Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "ok"
}
```

---

### Statistics

**GET** `/api/v1/stats`

Get database statistics including geometry counts and folder distribution.

**Response:**
```json
{
  "total_placemarks": 545,
  "total_styles": 44,
  "geometry_types": {
    "Point": 420,
    "LineString": 50,
    "Polygon": 75
  },
  "top_folders": {
    "Audio (911 calls)": 155,
    "Videos taken on foot": 132,
    "Las Vegas Village - Venue Features": 84,
    ...
  }
}
```

---

### List Placemarks

**GET** `/api/v1/placemarks`

List all placemarks with pagination.

**Query Parameters:**
- `limit` (int, default: 100) - Maximum results
- `offset` (int, default: 0) - Pagination offset
- `folder` (string) - Filter by folder name

**Response:**
```json
{
  "placemarks": [
    {
      "id": 1,
      "name": "Placemark Name",
      "description": "Description...",
      "style_id": "icon-1538-0288D1",
      "folder_path": ["Videos taken on foot"],
      "geometry_type": "Point",
      "geometry": "{\"type\":\"Point\",\"coordinates\":[-115.172,36.094]}",
      "media_links": ["https://youtube.com/..."],
      "created_at": "2026-01-02T22:48:54Z"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

---

### Get Placemark

**GET** `/api/v1/placemarks/{id}`

Get a single placemark by ID with extended data.

**Response:**
```json
{
  "id": 1,
  "name": "Placemark Name",
  "description": "Description...",
  "geometry_type": "Point",
  "geometry": "{\"type\":\"Point\",\"coordinates\":[-115.172,36.094]}",
  "media_links": ["https://youtube.com/..."],
  "extended_data": [
    {
      "key": "custom_field",
      "value": "value"
    }
  ]
}
```

---

### Timeline Events

**GET** `/api/v1/timeline/events`

Get all placemarks that have timestamps in their names, useful for building interactive timelines.

**Response:**
```json
[
  {
    "timestamp": null,
    "name": "10/1/2017 09:41:56 PM - Event Name",
    "description": "...",
    "location": {
      "lat": 36.094506,
      "lon": -115.172281
    },
    "media_links": ["https://youtube.com/..."],
    "placemark_id": 131,
    "folder_path": ["Videos taken on foot"]
  }
]
```

---

### Timeline Summary

**GET** `/api/v1/timeline`

Get timeline events with count metadata.

**Response:**
```json
{
  "events": [...],
  "count": 234
}
```

---

### Spatial Bounding Box Query

**GET** `/api/v1/spatial/bbox`

Get placemarks within a geographic bounding box.

**Query Parameters (required):**
- `min_lon` (float) - Minimum longitude
- `min_lat` (float) - Minimum latitude
- `max_lon` (float) - Maximum longitude
- `max_lat` (float) - Maximum latitude
- `limit` (int, default: 1000) - Maximum results

**Example:**
```
/api/v1/spatial/bbox?min_lon=-115.18&min_lat=36.09&max_lon=-115.16&max_lat=36.10&limit=50
```

**Response:**
```json
{
  "placemarks": [...],
  "bbox": {
    "min_lon": -115.18,
    "min_lat": 36.09,
    "max_lon": -115.16,
    "max_lat": 36.10
  },
  "count": 42
}
```

---

### List Folders

**GET** `/api/v1/folders`

Get all unique folder names from the dataset.

**Response:**
```json
{
  "folders": [
    "Audio (911 calls)",
    "Videos taken on foot",
    "LVMPD Body Worn Cameras",
    "Places of Interest",
    "Victims"
  ],
  "count": 9
}
```

---

## Data Model

### Placemark

```typescript
{
  id: number
  name: string
  description?: string
  style_id?: string
  folder_path: string[]
  geometry_type: "Point" | "LineString" | "Polygon"
  geometry: string  // GeoJSON
  coordinates_raw?: string
  media_links?: string[]
  created_at: timestamp
  extended_data?: Array<{key: string, value: string}>
}
```

### Timeline Event

```typescript
{
  timestamp?: Date
  name: string
  description?: string
  location?: {lat: number, lon: number}
  media_links?: string[]
  placemark_id: number
  folder_path: string[]
}
```

---

## Running the API

```bash
# Start database
docker-compose up -d

# Start API server
make api
# or
go run cmd/api/main.go
# or
./bin/api

# Server runs on http://localhost:8080
```

## CORS

API allows requests from:
- `http://localhost:*`
- `http://127.0.0.1:*`

For production, update CORS settings in `cmd/api/main.go`.
