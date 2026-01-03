package main

import (
	"context"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// KML namespace structures
type KML struct {
	XMLName  xml.Name `xml:"kml"`
	Document Document `xml:"Document"`
}

type Document struct {
	Name        string   `xml:"name"`
	Description string   `xml:"description"`
	Styles      []Style  `xml:"Style"`
	StyleMaps   []StyleMap `xml:"StyleMap"`
	Folders     []Folder `xml:"Folder"`
	Placemarks  []Placemark `xml:"Placemark"`
}

type Style struct {
	ID          string      `xml:"id,attr"`
	IconStyle   *IconStyle  `xml:"IconStyle"`
	LabelStyle  *LabelStyle `xml:"LabelStyle"`
	LineStyle   *LineStyle  `xml:"LineStyle"`
	PolyStyle   *PolyStyle  `xml:"PolyStyle"`
}

type StyleMap struct {
	ID string `xml:"id,attr"`
}

type IconStyle struct {
	Scale float64 `xml:"scale"`
	Icon  *Icon   `xml:"Icon"`
}

type Icon struct {
	Href string `xml:"href"`
}

type LabelStyle struct {
	Scale float64 `xml:"scale"`
}

type LineStyle struct {
	Color string  `xml:"color"`
	Width float64 `xml:"width"`
}

type PolyStyle struct {
	Color string `xml:"color"`
}

type Folder struct {
	Name       string      `xml:"name"`
	Placemarks []Placemark `xml:"Placemark"`
	Folders    []Folder    `xml:"Folder"`
}

type Placemark struct {
	Name         string        `xml:"name"`
	Description  string        `xml:"description"`
	StyleURL     string        `xml:"styleUrl"`
	Point        *Point        `xml:"Point"`
	LineString   *LineString   `xml:"LineString"`
	Polygon      *Polygon      `xml:"Polygon"`
	ExtendedData *ExtendedData `xml:"ExtendedData"`
}

type Point struct {
	Coordinates string `xml:"coordinates"`
}

type LineString struct {
	Coordinates string `xml:"coordinates"`
}

type Polygon struct {
	OuterBoundary OuterBoundary   `xml:"outerBoundaryIs"`
	InnerBoundary []InnerBoundary `xml:"innerBoundaryIs"`
}

type OuterBoundary struct {
	LinearRing LinearRing `xml:"LinearRing"`
}

type InnerBoundary struct {
	LinearRing LinearRing `xml:"LinearRing"`
}

type LinearRing struct {
	Coordinates string `xml:"coordinates"`
}

type ExtendedData struct {
	Data []Data `xml:"Data"`
}

type Data struct {
	Name  string `xml:"name,attr"`
	Value string `xml:"value"`
}

// Database record structures
type PlacemarkRecord struct {
	Name           string
	Description    string
	StyleID        string
	FolderPath     []string
	GeometryType   string
	GeomWKT        string
	CoordinatesRaw string
	MediaLinks     []string
	ExtendedData   map[string]string
}

func main() {
	kmlPath := flag.String("kml", "data/raw/doc.kml", "Path to KML file")
	truncate := flag.Bool("truncate", false, "Truncate existing data before import")
	dryRun := flag.Bool("dry-run", false, "Parse KML and print summary without database operations")
	limit := flag.Int("limit", 0, "Limit number of placemarks to import (0 = no limit)")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Parse KML
	placemarks, styles, err := parseKML(*kmlPath)
	if err != nil {
		log.Fatalf("Failed to parse KML: %v", err)
	}

	if *limit > 0 && len(placemarks) > *limit {
		placemarks = placemarks[:*limit]
	}

	// Print summary
	summary := summarize(styles, placemarks)
	fmt.Println(summary)

	if *dryRun {
		return
	}

	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := ensureSchema(ctx, pool); err != nil {
		log.Fatalf("Failed to create schema: %v", err)
	}

	if *truncate {
		if err := truncateData(ctx, pool); err != nil {
			log.Fatalf("Failed to truncate data: %v", err)
		}
	}

	// Import data
	if err := importStyles(ctx, pool, styles); err != nil {
		log.Fatalf("Failed to import styles: %v", err)
	}

	if err := importPlacemarks(ctx, pool, placemarks); err != nil {
		log.Fatalf("Failed to import placemarks: %v", err)
	}

	fmt.Printf("\nImported %d placemarks into PostgreSQL\n", len(placemarks))
}

func parseKML(path string) ([]PlacemarkRecord, []Style, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open KML file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read KML file: %w", err)
	}

	var kml KML
	if err := xml.Unmarshal(data, &kml); err != nil {
		return nil, nil, fmt.Errorf("failed to parse KML XML: %w", err)
	}

	var placemarks []PlacemarkRecord

	// Process top-level placemarks
	for _, pm := range kml.Document.Placemarks {
		if rec := processPlacemark(pm, []string{}); rec != nil {
			placemarks = append(placemarks, *rec)
		}
	}

	// Process folders recursively
	for _, folder := range kml.Document.Folders {
		placemarks = append(placemarks, processFolderPlacemarks(folder, []string{})...)
	}

	return placemarks, kml.Document.Styles, nil
}

func processFolderPlacemarks(folder Folder, parentPath []string) []PlacemarkRecord {
	var placemarks []PlacemarkRecord

	folderPath := append(parentPath, folder.Name)

	for _, pm := range folder.Placemarks {
		if rec := processPlacemark(pm, folderPath); rec != nil {
			placemarks = append(placemarks, *rec)
		}
	}

	// Process nested folders
	for _, subfolder := range folder.Folders {
		placemarks = append(placemarks, processFolderPlacemarks(subfolder, folderPath)...)
	}

	return placemarks
}

func processPlacemark(pm Placemark, folderPath []string) *PlacemarkRecord {
	var geomType, geomWKT, coordsRaw string

	if pm.Point != nil {
		geomType = "Point"
		coordsRaw = strings.TrimSpace(pm.Point.Coordinates)
		geomWKT = buildPointWKT(coordsRaw)
	} else if pm.LineString != nil {
		geomType = "LineString"
		coordsRaw = strings.TrimSpace(pm.LineString.Coordinates)
		geomWKT = buildLineStringWKT(coordsRaw)
	} else if pm.Polygon != nil {
		geomType = "Polygon"
		coordsRaw = strings.TrimSpace(pm.Polygon.OuterBoundary.LinearRing.Coordinates)
		geomWKT = buildPolygonWKT(pm.Polygon)
	} else {
		return nil
	}

	if geomWKT == "" {
		return nil
	}

	styleID := strings.TrimPrefix(pm.StyleURL, "#")

	extData := make(map[string]string)
	var mediaLinks []string

	if pm.ExtendedData != nil {
		for _, data := range pm.ExtendedData.Data {
			if data.Name == "gx_media_links" {
				mediaLinks = append(mediaLinks, data.Value)
			} else {
				extData[data.Name] = data.Value
			}
		}
	}

	return &PlacemarkRecord{
		Name:           strings.TrimSpace(pm.Name),
		Description:    strings.TrimSpace(pm.Description),
		StyleID:        styleID,
		FolderPath:     folderPath,
		GeometryType:   geomType,
		GeomWKT:        geomWKT,
		CoordinatesRaw: coordsRaw,
		MediaLinks:     mediaLinks,
		ExtendedData:   extData,
	}
}

func parseCoordinates(coordsText string) [][2]float64 {
	var coords [][2]float64
	parts := strings.Fields(strings.TrimSpace(coordsText))

	for _, part := range parts {
		vals := strings.Split(part, ",")
		if len(vals) < 2 {
			continue
		}

		var lon, lat float64
		if _, err := fmt.Sscanf(vals[0], "%f", &lon); err != nil {
			continue
		}
		if _, err := fmt.Sscanf(vals[1], "%f", &lat); err != nil {
			continue
		}

		coords = append(coords, [2]float64{lon, lat})
	}

	return coords
}

func buildPointWKT(coordsText string) string {
	coords := parseCoordinates(coordsText)
	if len(coords) == 0 {
		return ""
	}
	return fmt.Sprintf("POINT(%f %f)", coords[0][0], coords[0][1])
}

func buildLineStringWKT(coordsText string) string {
	coords := parseCoordinates(coordsText)
	if len(coords) < 2 {
		return ""
	}

	var points []string
	for _, c := range coords {
		points = append(points, fmt.Sprintf("%f %f", c[0], c[1]))
	}

	return fmt.Sprintf("LINESTRING(%s)", strings.Join(points, ", "))
}

func buildPolygonWKT(polygon *Polygon) string {
	outer := parseCoordinates(polygon.OuterBoundary.LinearRing.Coordinates)
	if len(outer) < 3 {
		return ""
	}

	// Ensure ring is closed
	if outer[0] != outer[len(outer)-1] {
		outer = append(outer, outer[0])
	}

	var outerPoints []string
	for _, c := range outer {
		outerPoints = append(outerPoints, fmt.Sprintf("%f %f", c[0], c[1]))
	}

	rings := []string{fmt.Sprintf("(%s)", strings.Join(outerPoints, ", "))}

	// Process inner rings (holes)
	for _, inner := range polygon.InnerBoundary {
		innerCoords := parseCoordinates(inner.LinearRing.Coordinates)
		if len(innerCoords) < 3 {
			continue
		}

		if innerCoords[0] != innerCoords[len(innerCoords)-1] {
			innerCoords = append(innerCoords, innerCoords[0])
		}

		var innerPoints []string
		for _, c := range innerCoords {
			innerPoints = append(innerPoints, fmt.Sprintf("%f %f", c[0], c[1]))
		}

		rings = append(rings, fmt.Sprintf("(%s)", strings.Join(innerPoints, ", ")))
	}

	return fmt.Sprintf("POLYGON(%s)", strings.Join(rings, ", "))
}

func summarize(styles []Style, placemarks []PlacemarkRecord) string {
	typeCounts := make(map[string]int)
	for _, pm := range placemarks {
		typeCounts[pm.GeometryType]++
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Styles: %d\n", len(styles)))
	sb.WriteString(fmt.Sprintf("Placemarks: %d\n", len(placemarks)))

	for geomType, count := range typeCounts {
		sb.WriteString(fmt.Sprintf("  %s: %d\n", geomType, count))
	}

	return sb.String()
}

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	schema := `
		CREATE EXTENSION IF NOT EXISTS postgis;

		CREATE TABLE IF NOT EXISTS styles (
			id TEXT PRIMARY KEY,
			icon_href TEXT,
			icon_scale DOUBLE PRECISION,
			label_scale DOUBLE PRECISION,
			raw_xml TEXT
		);

		CREATE TABLE IF NOT EXISTS placemarks (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			style_id TEXT REFERENCES styles(id),
			folder_path TEXT[],
			geometry_type TEXT NOT NULL,
			geom GEOMETRY(GEOMETRY, 4326) NOT NULL,
			coordinates_raw TEXT,
			gx_media_links TEXT[],
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS placemark_data (
			id SERIAL PRIMARY KEY,
			placemark_id INTEGER REFERENCES placemarks(id) ON DELETE CASCADE,
			key TEXT,
			value TEXT
		);

		CREATE INDEX IF NOT EXISTS placemarks_geom_gix ON placemarks USING GIST (geom);
		CREATE INDEX IF NOT EXISTS placemarks_folder_gin ON placemarks USING GIN (folder_path);
	`

	_, err := pool.Exec(ctx, schema)
	return err
}

func truncateData(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, "TRUNCATE placemark_data, placemarks RESTART IDENTITY CASCADE")
	return err
}

func importStyles(ctx context.Context, pool *pgxpool.Pool, styles []Style) error {
	if len(styles) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	for _, style := range styles {
		var iconHref *string
		var iconScale, labelScale *float64

		if style.IconStyle != nil {
			iconScale = &style.IconStyle.Scale
			if style.IconStyle.Icon != nil {
				iconHref = &style.IconStyle.Icon.Href
			}
		}

		if style.LabelStyle != nil {
			labelScale = &style.LabelStyle.Scale
		}

		batch.Queue(
			`INSERT INTO styles (id, icon_href, icon_scale, label_scale, raw_xml)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (id) DO UPDATE SET
			   icon_href = EXCLUDED.icon_href,
			   icon_scale = EXCLUDED.icon_scale,
			   label_scale = EXCLUDED.label_scale,
			   raw_xml = EXCLUDED.raw_xml`,
			style.ID, iconHref, iconScale, labelScale, "",
		)
	}

	br := pool.SendBatch(ctx, batch)
	defer br.Close()

	for range styles {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("failed to insert style: %w", err)
		}
	}

	return nil
}

func importPlacemarks(ctx context.Context, pool *pgxpool.Pool, placemarks []PlacemarkRecord) error {
	if len(placemarks) == 0 {
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, pm := range placemarks {
		var styleID *string
		if pm.StyleID != "" {
			// Verify style exists before referencing it
			var exists bool
			err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM styles WHERE id = $1)", pm.StyleID).Scan(&exists)
			if err == nil && exists {
				styleID = &pm.StyleID
			}
		}

		var mediaLinks []string
		if len(pm.MediaLinks) > 0 {
			mediaLinks = pm.MediaLinks
		}

		var placemarkID int
		err := tx.QueryRow(
			ctx,
			`INSERT INTO placemarks
			 (name, description, style_id, folder_path, geometry_type, geom, coordinates_raw, gx_media_links)
			 VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7, $8)
			 RETURNING id`,
			pm.Name, pm.Description, styleID, pm.FolderPath, pm.GeometryType,
			pm.GeomWKT, pm.CoordinatesRaw, mediaLinks,
		).Scan(&placemarkID)

		if err != nil {
			return fmt.Errorf("failed to insert placemark: %w", err)
		}

		// Insert extended data
		for key, value := range pm.ExtendedData {
			_, err := tx.Exec(
				ctx,
				`INSERT INTO placemark_data (placemark_id, key, value) VALUES ($1, $2, $3)`,
				placemarkID, key, value,
			)
			if err != nil {
				return fmt.Errorf("failed to insert extended data: %w", err)
			}
		}
	}

	return tx.Commit(ctx)
}
