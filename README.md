# Mandalay - Vegas Shooting Map Data

Go backend for extracting and managing KML geographic data from the Vegas Shooting Map in a PostGIS-enabled PostgreSQL database.

## Architecture

- **Backend**: Go with pgx for PostgreSQL connectivity
- **Database**: PostgreSQL 16 with PostGIS 3.4 (Docker)
- **Data Source**: KMZ/KML file containing 545 placemarks (420 points, 50 lines, 75 polygons)

## Project Structure

```
mandalay/
├── cmd/
│   └── import/         # KML import CLI tool
├── data/
│   └── raw/           # Extracted KML and assets
├── docker-compose.yml  # PostgreSQL/PostGIS container
├── .env               # Database connection config
└── go.mod
```

## Database Schema

### Tables

**styles** - KML style definitions
- `id` (PK) - Style identifier
- `icon_href`, `icon_scale`, `label_scale` - Icon styling
- `raw_xml` - Original XML

**placemarks** - Geographic features
- `id` (PK, serial)
- `name`, `description` - Feature metadata
- `style_id` (FK → styles)
- `folder_path` (text[]) - Hierarchical location
- `geometry_type` - Point/LineString/Polygon
- `geom` (geometry SRID 4326) - PostGIS geometry
- `coordinates_raw` - Original coordinate text
- `gx_media_links` (text[]) - YouTube/media URLs
- `created_at` - Timestamp

**placemark_data** - Extended key-value attributes
- `placemark_id` (FK → placemarks)
- `key`, `value`

### Indexes
- GIST index on `geom` for spatial queries
- GIN index on `folder_path` for hierarchy queries

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

Container runs at `localhost:5432` with credentials:
- User: `mandalay`
- Password: `mandalay`
- Database: `vegasmap`

### 2. Import KML Data

```bash
# Dry run (parse only, no database writes)
go run cmd/import/main.go --dry-run

# Import with existing data truncation
go run cmd/import/main.go --truncate

# Limit import for testing
go run cmd/import/main.go --limit 50
```

### 3. Query the Data

```bash
# Connect to database
PGPASSWORD=mandalay psql -h localhost -U mandalay -d vegasmap

# Sample queries
SELECT geometry_type, COUNT(*) FROM placemarks GROUP BY geometry_type;
SELECT name, ST_AsText(geom) FROM placemarks WHERE geometry_type = 'Point' LIMIT 5;
```

## Current Status

✅ 545 placemarks imported
✅ 44 styles loaded
✅ PostGIS spatial indexes created
✅ Docker containerized database

## Next Steps

- Build REST API for querying placemarks
- Add spatial query endpoints (bbox, radius search)
- Implement frontend map visualization
- Add data update/CRUD operations

## Environment

Copy `.env` and adjust if needed:

```
DATABASE_URL=postgresql://mandalay:mandalay@localhost:5432/vegasmap?sslmode=disable
```

## Dependencies

- Go 1.24+
- Docker & Docker Compose
- PostgreSQL client (optional, for psql)

```bash
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
go get github.com/joho/godotenv
```
