.PHONY: help deps fmt lint test build build-api build-import api docker-up docker-down docker-logs db-shell import-data devstack clean web-install web-dev web-build web-lint web-preview web-test

GO ?= go
DOCKER_COMPOSE ?= docker-compose
WEB_DIR ?= web
API_BIN := bin/api
IMPORT_BIN := bin/import
DB_CONTAINER := mandalay-postgres

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# Go tooling
deps: ## Download and tidy Go modules
	@$(GO) mod download
	@$(GO) mod tidy

fmt: ## Format Go code
	@$(GO) fmt ./...

lint: ## Lint Go code (go vet)
	@$(GO) vet ./...

test: ## Run Go tests
	@$(GO) test -v ./...

build: build-import build-api ## Build all binaries

build-import: ## Build importer binary
	@echo "Building import tool..."
	@$(GO) build -o $(IMPORT_BIN) ./cmd/import

build-api: ## Build API server binary
	@echo "Building API server..."
	@$(GO) build -o $(API_BIN) ./cmd/api

# Database / Docker
docker-up: ## Start PostgreSQL/PostGIS container
	@$(DOCKER_COMPOSE) up -d
	@echo "Waiting for database to be ready..."
	@sleep 3

docker-down: ## Stop PostgreSQL container
	@$(DOCKER_COMPOSE) down

docker-logs: ## View PostgreSQL container logs
	@$(DOCKER_COMPOSE) logs -f postgres

db-shell: ## Open psql shell inside database container
	@docker exec -it $(DB_CONTAINER) psql -U mandalay -d vegasmap

import-data: docker-up ## Import KML data into database (truncate existing)
	@echo "Importing KML data..."
	@$(GO) run ./cmd/import/main.go --truncate
	@echo "Import complete!"

# API server helpers
api: docker-up ## Start API server (go run) against containerized DB
	@echo "Starting API server on :8080..."
	@$(GO) run ./cmd/api/main.go

# Full-stack local dev helper
devstack: import-data ## Start DB, import KML data, then run API server
	@echo "Starting API server on :8080..."
	@$(GO) run ./cmd/api/main.go

# Frontend (Vite/React/Tailwind)
web-install: ## Install web dependencies
	@npm install --prefix $(WEB_DIR)

web-dev: ## Run Vite dev server
	@npm run dev --prefix $(WEB_DIR)

web-build: ## Build frontend
	@npm run build --prefix $(WEB_DIR)

web-lint: ## Lint frontend
	@npm run lint --prefix $(WEB_DIR)

web-preview: ## Preview built frontend
	@npm run preview --prefix $(WEB_DIR)

web-test: ## Run frontend tests
	@npm test --prefix $(WEB_DIR)

clean: ## Clean build artifacts
	@rm -rf bin/
	@echo "Cleaned build artifacts"
