// Claude tool definitions for structured visualization responses

export const visualizationTools = [
  {
    name: "render_cards",
    description:
      "Render a grid of cards with images for lists of items (destinations, products, restaurants, people, etc). Use this when the user asks for recommendations, top lists, or collections of items.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Section heading" },
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              imageQuery: {
                type: "string",
                description:
                  "Search query for finding a relevant image (used with Unsplash)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Metadata tags like rating, price, location",
              },
              rating: { type: "number", description: "Rating out of 5" },
              subtitle: { type: "string", description: "Secondary info line" },
            },
            required: ["title", "description", "imageQuery"],
          },
        },
      },
      required: ["title", "cards"],
    },
  },
  {
    name: "render_comparison",
    description:
      "Render a side-by-side comparison of two or more items. Use when user asks to compare products, services, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              imageQuery: { type: "string" },
              specs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["label", "value"],
                },
              },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
              verdict: { type: "string" },
            },
            required: ["name", "specs"],
          },
        },
      },
      required: ["title", "items"],
    },
  },
  {
    name: "render_stats",
    description:
      "Render large stat cards with numbers and labels. Use for metrics, KPIs, financial data summaries.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        stats: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              change: { type: "string", description: "e.g. +12% or -5%" },
              changeDirection: {
                type: "string",
                enum: ["up", "down", "neutral"],
              },
            },
            required: ["label", "value"],
          },
        },
      },
      required: ["title", "stats"],
    },
  },
  {
    name: "render_chart",
    description:
      "Render a chart/graph visualization. Use for data trends, analytics, time series data.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        chartType: {
          type: "string",
          enum: ["line", "bar", "area", "pie"],
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "number" },
              category: { type: "string" },
            },
            required: ["label", "value"],
          },
        },
        xLabel: { type: "string" },
        yLabel: { type: "string" },
      },
      required: ["title", "chartType", "data"],
    },
  },
  {
    name: "render_timeline",
    description:
      "Render a timeline of events. Use for chronological data, history, news recaps.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              imageQuery: { type: "string" },
              tag: { type: "string" },
            },
            required: ["date", "title", "description"],
          },
        },
      },
      required: ["title", "events"],
    },
  },
  {
    name: "render_table",
    description:
      "Render a data table with sortable columns. Use for structured tabular data.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              align: { type: "string", enum: ["left", "center", "right"] },
            },
            required: ["key", "label"],
          },
        },
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
      required: ["title", "columns", "rows"],
    },
  },
];

// Types for visualization blocks
export type VisualizationBlock =
  | { type: "text"; content: string }
  | { type: "render_cards"; data: CardGridData }
  | { type: "render_comparison"; data: ComparisonData }
  | { type: "render_stats"; data: StatsData }
  | { type: "render_chart"; data: ChartData }
  | { type: "render_timeline"; data: TimelineData }
  | { type: "render_table"; data: TableData };

export interface CardGridData {
  title: string;
  cards: {
    title: string;
    description: string;
    imageQuery: string;
    tags?: string[];
    rating?: number;
    subtitle?: string;
  }[];
}

export interface ComparisonData {
  title: string;
  items: {
    name: string;
    imageQuery?: string;
    specs: { label: string; value: string }[];
    pros?: string[];
    cons?: string[];
    verdict?: string;
  }[];
}

export interface StatsData {
  title: string;
  stats: {
    label: string;
    value: string;
    change?: string;
    changeDirection?: "up" | "down" | "neutral";
  }[];
}

export interface ChartData {
  title: string;
  chartType: "line" | "bar" | "area" | "pie";
  data: { label: string; value: number; category?: string }[];
  xLabel?: string;
  yLabel?: string;
}

export interface TimelineData {
  title: string;
  events: {
    date: string;
    title: string;
    description: string;
    imageQuery?: string;
    tag?: string;
  }[];
}

export interface TableData {
  title: string;
  columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
  rows: Record<string, string>[];
}
