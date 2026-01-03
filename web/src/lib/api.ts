const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export async function fetchTimelineEvents() {
  const response = await fetch(`${API_BASE_URL}/timeline/events`);
  if (!response.ok) {
    throw new Error('Failed to fetch timeline events');
  }
  return response.json();
}

export async function fetchStats() {
  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

export async function fetchPlacemarks(params?: {
  limit?: number;
  offset?: number;
  folder?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.folder) searchParams.set('folder', params.folder);

  const response = await fetch(`${API_BASE_URL}/placemarks?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch placemarks');
  }
  return response.json();
}

export async function fetchPlacemark(id: number) {
  const response = await fetch(`${API_BASE_URL}/placemarks/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch placemark');
  }
  return response.json();
}

export async function fetchFolders() {
  const response = await fetch(`${API_BASE_URL}/folders`);
  if (!response.ok) {
    throw new Error('Failed to fetch folders');
  }
  return response.json();
}

export async function fetchPlacemarksBBox(params: {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('min_lon', params.min_lon.toString());
  searchParams.set('min_lat', params.min_lat.toString());
  searchParams.set('max_lon', params.max_lon.toString());
  searchParams.set('max_lat', params.max_lat.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/spatial/bbox?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch placemarks by bbox');
  }
  return response.json();
}
