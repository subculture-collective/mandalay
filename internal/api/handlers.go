package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/onnwee/mandalay/internal/store"
)

type Handlers struct {
	placemarkStore *store.PlacemarkStore
}

func NewHandlers(placemarkStore *store.PlacemarkStore) *Handlers {
	return &Handlers{
		placemarkStore: placemarkStore,
	}
}

func (h *Handlers) ListPlacemarks(w http.ResponseWriter, r *http.Request) {
	limit := getIntParam(r, "limit", 100)
	offset := getIntParam(r, "offset", 0)
	folder := r.URL.Query().Get("folder")

	placemarks, err := h.placemarkStore.List(r.Context(), limit, offset, folder)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"placemarks": placemarks,
		"limit":      limit,
		"offset":     offset,
	})
}

func (h *Handlers) GetPlacemark(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid id")
		return
	}

	placemark, err := h.placemarkStore.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "placemark not found")
		return
	}

	respondJSON(w, http.StatusOK, placemark)
}

func (h *Handlers) GetTimeline(w http.ResponseWriter, r *http.Request) {
	events, err := h.placemarkStore.GetTimeline(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"count":  len(events),
	})
}

func (h *Handlers) GetTimelineEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.placemarkStore.GetTimeline(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, events)
}

func (h *Handlers) GetPlacemarksInBBox(w http.ResponseWriter, r *http.Request) {
	minLon := getFloatParam(r, "min_lon", 0)
	minLat := getFloatParam(r, "min_lat", 0)
	maxLon := getFloatParam(r, "max_lon", 0)
	maxLat := getFloatParam(r, "max_lat", 0)
	limit := getIntParam(r, "limit", 1000)

	if minLon == 0 || minLat == 0 || maxLon == 0 || maxLat == 0 {
		respondError(w, http.StatusBadRequest, "missing bbox parameters")
		return
	}

	bbox := store.BoundingBox{
		MinLon: minLon,
		MinLat: minLat,
		MaxLon: maxLon,
		MaxLat: maxLat,
	}

	placemarks, err := h.placemarkStore.GetInBBox(r.Context(), bbox, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"placemarks": placemarks,
		"bbox":       bbox,
		"count":      len(placemarks),
	})
}

func (h *Handlers) ListFolders(w http.ResponseWriter, r *http.Request) {
	folders, err := h.placemarkStore.ListFolders(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"folders": folders,
		"count":   len(folders),
	})
}

func (h *Handlers) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.placemarkStore.GetStats(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

func getIntParam(r *http.Request, key string, defaultVal int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	intVal, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return intVal
}

func getFloatParam(r *http.Request, key string, defaultVal float64) float64 {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	floatVal, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return defaultVal
	}
	return floatVal
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
