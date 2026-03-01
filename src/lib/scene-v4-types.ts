// WHUT OS V4 — Scene & Primitive Types

export type PrimitiveType =
  | "metric"
  | "list"
  | "detail"
  | "text"
  | "chart-line"
  | "chart-bar"
  | "chart-radial"
  | "image"
  | "table"
  | "timeline"
  | "search-results"
  | "embed"
  | "chart-radar"
  | "chart-candlestick"
  | "chart-gauge"
  | "rich-entity-card"
  | "map-view"
  | "gallery"
  | "comparison-table";

export type LayoutMode = "ambient" | "focused" | "split" | "immersive" | "minimal" | "grid" | "stack" | "cinematic" | "spatial";
export type ElementRole = "primary" | "supporting" | "context";
export type ElementPriority = 1 | 2 | 3;
export type ElementSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";
export type ElementPosition = "left" | "right" | "center" | "top" | "bottom" | "float";
export type AnimationType = "slide-in" | "fade" | "morph" | "pulse" | "none";
export type CloseAction = "dismiss" | "minimize" | "persist";
export type ElementState = "visible" | "dismissed" | "minimized";

export interface SceneElement {
  id: string;
  type: PrimitiveType;
  data: any;
  priority: ElementPriority;
  size?: ElementSize;
  position?: ElementPosition;
  animate?: AnimationType;
  interactive?: boolean;
  onClose?: CloseAction;
  canReopen?: boolean;
  title?: string;
  role?: ElementRole;
}

export interface Scene {
  id: string;
  intent: string;
  layout: LayoutMode;
  elements: SceneElement[];
  emphasis?: string;
  spoken?: string;
}

export interface LayoutRect {
  x: number;       // percentage
  y: number;       // percentage
  width: string;   // CSS value
  height: string;  // CSS value
  gridArea?: string;
}

// Primitive data shapes
export interface MetricData {
  label: string;
  value: string | number;
  change?: number;       // percentage change
  trend?: "up" | "down" | "flat";
  unit?: string;
  gauge?: { min: number; max: number; value: number };
}

export interface ListItemDetail {
  description?: string;
  image?: string;       // hero image URL
  address?: string;
  rating?: string;
  price?: string;
  tags?: string[];
  url?: string;         // link to source
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: string;
  image?: string;
  unread?: boolean;
  badge?: string;
  detail?: ListItemDetail;
}

export interface ListData {
  items: ListItem[];
  title?: string;
}

export interface DetailSection {
  label: string;
  content: string;
  type?: "text" | "html" | "code";
}

export interface DetailData {
  title: string;
  subtitle?: string;
  sections: DetailSection[];
  meta?: Record<string, string>;
  /** Contextual data for action providers. Key = provider name (e.g. "email"). */
  context?: Record<string, Record<string, unknown>>;
}

export interface TextData {
  content: string;
  typewriter?: boolean;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartLineData {
  points: ChartPoint[];
  color?: string;
  label?: string;
  yLabel?: string;
}

export interface ChartBarData {
  bars: ChartPoint[];
  color?: string;
  label?: string;
  horizontal?: boolean;
}

export interface ChartRadialData {
  value: number;
  max: number;
  label: string;
  color?: string;
}

export interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
  title?: string;
}

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  active?: boolean;
}

export interface TimelineData {
  events: TimelineEvent[];
  title?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

export interface SearchResultsData {
  results: SearchResult[];
  query: string;
}

export interface EmbedData {
  html?: string;
  url?: string;
  title?: string;
}

// ── Rich Response Primitives ────────────────────────────

export interface RichEntityCardData {
  title: string;
  subtitle?: string;
  heroImage?: string;
  rating?: { score: number; count?: number; source?: string };
  price?: string; // "$", "$$", "$$$", "$$$$" or "€10-25"
  tags?: string[];
  description?: string;
  highlights?: string[]; // menu highlights, key features, etc.
  actions?: { label: string; url?: string; type?: "primary" | "secondary" }[];
  location?: { lat: number; lng: number; address?: string };
  reviewSnippet?: string;
}

export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

export interface MapViewData {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  title?: string;
  style?: "dark" | "light";
}

export interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

export interface GalleryData {
  images: GalleryImage[];
  title?: string;
}

export interface ComparisonColumn {
  name: string;
  image?: string;
  values: Record<string, string | number>;
}

export interface ComparisonTableData {
  columns: ComparisonColumn[];
  metrics: string[]; // row labels
  title?: string;
  highlightBest?: boolean;
}
