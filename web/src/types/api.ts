export interface TimelineEvent {
  timestamp: string | null;
  name: string;
  description?: string;
  location?: {
    lat: number;
    lon: number;
  };
  media_links?: string[];
  placemark_id: number;
  folder_path: string[];
}

export interface Placemark {
  id: number;
  name: string;
  description?: string;
  style_id?: string;
  folder_path: string[];
  geometry_type: string;
  geometry: string;
  coordinates_raw?: string;
  media_links?: string[];
  created_at: string;
}

export interface Stats {
  total_placemarks: number;
  total_styles: number;
  geometry_types: {
    [key: string]: number;
  };
  top_folders: {
    [key: string]: number;
  };
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

export interface PlacemarkDetail {
  id: number;
  name: string;
  description?: string;
  style_id?: string;
  folder_path: string[];
  timestamp?: string;
  location?: GeoJSONGeometry;
  media_links?: string[];
}
