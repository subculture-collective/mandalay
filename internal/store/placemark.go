package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Placemark struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	StyleID        *string   `json:"style_id,omitempty"`
	FolderPath     []string  `json:"folder_path"`
	GeometryType   string    `json:"geometry_type"`
	Geometry       string    `json:"geometry"`
	CoordinatesRaw string    `json:"coordinates_raw,omitempty"`
	MediaLinks     []string  `json:"media_links,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	ExtendedData   []KVPair  `json:"extended_data,omitempty"`
}

type KVPair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type TimelineEvent struct {
	Timestamp   *time.Time `json:"timestamp,omitempty"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	Location    *Point     `json:"location,omitempty"`
	MediaLinks  []string   `json:"media_links,omitempty"`
	PlacemarkID int        `json:"placemark_id"`
	FolderPath  []string   `json:"folder_path"`
}

type Point struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type BoundingBox struct {
	MinLon float64 `json:"min_lon"`
	MinLat float64 `json:"min_lat"`
	MaxLon float64 `json:"max_lon"`
	MaxLat float64 `json:"max_lat"`
}

type PlacemarkStore struct {
	db *pgxpool.Pool
}

func NewPlacemarkStore(db *pgxpool.Pool) *PlacemarkStore {
	return &PlacemarkStore{db: db}
}

func (s *PlacemarkStore) List(ctx context.Context, limit, offset int, folderFilter string) ([]Placemark, error) {
	query := `
		SELECT id, name, description, style_id, folder_path, geometry_type,
		       ST_AsGeoJSON(geom) as geometry, coordinates_raw, gx_media_links, created_at
		FROM placemarks
		WHERE ($3 = '' OR $3 = ANY(folder_path))
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.Query(ctx, query, limit, offset, folderFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to query placemarks: %w", err)
	}
	defer rows.Close()

	var placemarks []Placemark
	for rows.Next() {
		var p Placemark
		err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.StyleID, &p.FolderPath,
			&p.GeometryType, &p.Geometry, &p.CoordinatesRaw, &p.MediaLinks, &p.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan placemark: %w", err)
		}
		placemarks = append(placemarks, p)
	}

	return placemarks, nil
}

func (s *PlacemarkStore) GetByID(ctx context.Context, id int) (*Placemark, error) {
	query := `
		SELECT p.id, p.name, p.description, p.style_id, p.folder_path, p.geometry_type,
		       ST_AsGeoJSON(p.geom) as geometry, p.coordinates_raw, p.gx_media_links, p.created_at
		FROM placemarks p
		WHERE p.id = $1
	`

	var p Placemark
	err := s.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.StyleID, &p.FolderPath,
		&p.GeometryType, &p.Geometry, &p.CoordinatesRaw, &p.MediaLinks, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get placemark: %w", err)
	}

	// Fetch extended data
	extQuery := `SELECT key, value FROM placemark_data WHERE placemark_id = $1`
	extRows, err := s.db.Query(ctx, extQuery, id)
	if err != nil {
		return &p, nil
	}
	defer extRows.Close()

	for extRows.Next() {
		var kv KVPair
		if err := extRows.Scan(&kv.Key, &kv.Value); err == nil {
			p.ExtendedData = append(p.ExtendedData, kv)
		}
	}

	return &p, nil
}

func (s *PlacemarkStore) GetInBBox(ctx context.Context, bbox BoundingBox, limit int) ([]Placemark, error) {
	query := `
		SELECT id, name, description, style_id, folder_path, geometry_type,
		       ST_AsGeoJSON(geom) as geometry, coordinates_raw, gx_media_links, created_at
		FROM placemarks
		WHERE ST_Intersects(
			geom,
			ST_MakeEnvelope($1, $2, $3, $4, 4326)
		)
		LIMIT $5
	`

	rows, err := s.db.Query(ctx, query, bbox.MinLon, bbox.MinLat, bbox.MaxLon, bbox.MaxLat, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query bbox: %w", err)
	}
	defer rows.Close()

	var placemarks []Placemark
	for rows.Next() {
		var p Placemark
		err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.StyleID, &p.FolderPath,
			&p.GeometryType, &p.Geometry, &p.CoordinatesRaw, &p.MediaLinks, &p.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan placemark: %w", err)
		}
		placemarks = append(placemarks, p)
	}

	return placemarks, nil
}

func (s *PlacemarkStore) GetTimeline(ctx context.Context) ([]TimelineEvent, error) {
	query := `
		SELECT id, name, description, geometry_type, ST_AsGeoJSON(geom) as geometry,
		       gx_media_links, folder_path
		FROM placemarks
		WHERE name ~ '^\d{1,2}/\d{1,2}/\d{4}'
		ORDER BY name
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query timeline: %w", err)
	}
	defer rows.Close()

	var events []TimelineEvent
	for rows.Next() {
		var (
			id          int
			name        string
			description string
			geomType    string
			geometry    string
			mediaLinks  []string
			folderPath  []string
		)

		err := rows.Scan(&id, &name, &description, &geomType, &geometry, &mediaLinks, &folderPath)
		if err != nil {
			continue
		}

		event := TimelineEvent{
			PlacemarkID: id,
			Name:        name,
			Description: description,
			MediaLinks:  mediaLinks,
			FolderPath:  folderPath,
		}

		// Parse timestamp from name
		event.Timestamp = parseTimestampFromName(name)

		// Extract point if geometry is a point
		if geomType == "Point" {
			event.Location = extractPointFromGeoJSON(geometry)
		}

		events = append(events, event)
	}

	return events, nil
}

func (s *PlacemarkStore) ListFolders(ctx context.Context) ([]string, error) {
	query := `
		SELECT DISTINCT unnest(folder_path) as folder
		FROM placemarks
		WHERE array_length(folder_path, 1) > 0
		ORDER BY folder
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query folders: %w", err)
	}
	defer rows.Close()

	var folders []string
	for rows.Next() {
		var folder string
		if err := rows.Scan(&folder); err == nil {
			folders = append(folders, folder)
		}
	}

	return folders, nil
}

func (s *PlacemarkStore) GetStats(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total counts
	var totalPlacemarks, totalStyles int
	s.db.QueryRow(ctx, "SELECT COUNT(*) FROM placemarks").Scan(&totalPlacemarks)
	s.db.QueryRow(ctx, "SELECT COUNT(*) FROM styles").Scan(&totalStyles)

	stats["total_placemarks"] = totalPlacemarks
	stats["total_styles"] = totalStyles

	// Geometry type breakdown
	geomQuery := `SELECT geometry_type, COUNT(*) FROM placemarks GROUP BY geometry_type`
	rows, err := s.db.Query(ctx, geomQuery)
	if err == nil {
		defer rows.Close()
		geomTypes := make(map[string]int)
		for rows.Next() {
			var gtype string
			var count int
			if rows.Scan(&gtype, &count) == nil {
				geomTypes[gtype] = count
			}
		}
		stats["geometry_types"] = geomTypes
	}

	// Folders
	folderQuery := `SELECT unnest(folder_path) as folder, COUNT(*) FROM placemarks GROUP BY folder ORDER BY COUNT(*) DESC LIMIT 10`
	rows2, err := s.db.Query(ctx, folderQuery)
	if err == nil {
		defer rows2.Close()
		folders := make(map[string]int)
		for rows2.Next() {
			var folder string
			var count int
			if rows2.Scan(&folder, &count) == nil {
				folders[folder] = count
			}
		}
		stats["top_folders"] = folders
	}

	return stats, nil
}

func parseTimestampFromName(name string) *time.Time {
	layouts := []string{
		"1/2/2006  3:04:05 PM",
		"01/02/2006  03:04:05 PM",
		"1/2/2006 3:04:05 PM",
		"01/02/2006 03:04:05 PM",
	}

	for _, layout := range layouts {
		if len(name) < len(layout) {
			continue
		}
		timeStr := name[:len(layout)]
		if t, err := time.Parse(layout, timeStr); err == nil {
			return &t
		}
	}

	return nil
}

func extractPointFromGeoJSON(geojson string) *Point {
	var result struct {
		Coordinates []float64 `json:"coordinates"`
	}

	if err := json.Unmarshal([]byte(geojson), &result); err != nil {
		return nil
	}

	if len(result.Coordinates) < 2 {
		return nil
	}

	return &Point{
		Lon: result.Coordinates[0],
		Lat: result.Coordinates[1],
	}
}
