// WHUT OS Visualization Engine v2 — Scene Graph Types
//
// SceneNode is a flat interface with optional fields rather than a strict
// discriminated union. This keeps the recursive SceneRenderer simple — it
// can access .children, .data, .dataSource etc. without narrowing every time.

// ─── Data Source ──────────────────────────────────────────

export interface DataSource {
  integration: "gmail" | "calendar" | "drive" | "tiktok" | "shopify";
  method: string;
  params?: Record<string, any>;
  transform?: string;
}

// ─── Scene Node ──────────────────────────────────────────

export interface SceneNode {
  // Node type — layout or component
  type:
    | "grid" | "flex" | "stack"                     // layout
    | "stat-cards" | "email-list" | "calendar-events" | "file-list"
    | "chart" | "card-grid" | "comparison" | "table" | "timeline"
    | "text-block" | "markdown" | "email-compose" | "form"
    | "commerce-summary" | "action-button";

  // Layout props
  columns?: number;
  gap?: number;
  direction?: "row" | "col";
  children?: SceneNode[];

  // Shared props
  id?: string;
  title?: string;
  span?: number;
  loading?: string;
  minHeight?: string;

  // Data binding (component nodes)
  data?: any;
  dataSource?: DataSource;
}

// Convenience aliases for strict typing when needed
export type LayoutNode = SceneNode & { type: "grid" | "flex" | "stack"; children: SceneNode[] };
export type ComponentNode = SceneNode & { type: Exclude<SceneNode["type"], "grid" | "flex" | "stack"> };

// ─── Action ──────────────────────────────────────────────

export interface Action {
  type: "send_email" | "create_event" | "search_drive" | "reply_email";
  params: Record<string, any>;
  confirm?: boolean;
}

// ─── All Component Type Strings ──────────────────────────

export const COMPONENT_TYPES = [
  "stat-cards",
  "email-list",
  "calendar-events",
  "file-list",
  "chart",
  "card-grid",
  "comparison",
  "table",
  "timeline",
  "text-block",
  "markdown",
  "email-compose",
  "form",
  "commerce-summary",
  "action-button",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const LAYOUT_TYPES = ["grid", "flex", "stack"] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

// ─── Type Guards ─────────────────────────────────────────

export function isLayoutNode(node: SceneNode): node is LayoutNode {
  return node.type === "grid" || node.type === "flex" || node.type === "stack";
}

export function isComponentNode(node: SceneNode): node is ComponentNode {
  return !isLayoutNode(node);
}

// ─── render_scene Tool Definition ────────────────────────

export const renderSceneTool = {
  name: "render_scene",
  description:
    "Render a composed visual scene with multiple components in a spatial layout. Use grid/flex/stack layout nodes to arrange components. Components can use inline data or dataSource bindings for connected integrations.",
  input_schema: {
    type: "object" as const,
    properties: {
      layout: {
        type: "object",
        description:
          "Root scene node. Must be a layout node (grid/flex/stack) or a component node.",
        properties: {
          type: {
            type: "string",
            description:
              "Node type: layout (grid/flex/stack) or component (stat-cards, email-list, calendar-events, file-list, chart, card-grid, comparison, table, timeline, text-block, markdown, email-compose, form, commerce-summary, action-button)",
          },
          columns: {
            type: "number",
            description: "For grid: number of columns (1-4)",
          },
          gap: {
            type: "number",
            description: "Gap between children in pixels",
          },
          direction: {
            type: "string",
            enum: ["row", "col"],
            description: "For flex: direction",
          },
          span: {
            type: "number",
            description: "Column span within parent grid",
          },
          children: {
            type: "array",
            description: "Child scene nodes (for layout nodes)",
            items: { type: "object" },
          },
          id: { type: "string" },
          title: { type: "string" },
          loading: {
            type: "string",
            description: "Skeleton label while data loads",
          },
          minHeight: { type: "string" },
          data: {
            type: "object",
            description: "Inline data for the component",
          },
          dataSource: {
            type: "object",
            description:
              "Data binding to a connected integration. Properties: integration (gmail|calendar|drive|tiktok|shopify), method (string), params (object), transform (string).",
            properties: {
              integration: {
                type: "string",
                enum: ["gmail", "calendar", "drive", "tiktok", "shopify"],
              },
              method: { type: "string" },
              params: { type: "object" },
              transform: { type: "string" },
            },
            required: ["integration", "method"],
          },
        },
        required: ["type"],
      },
      actions: {
        type: "array",
        description:
          "Server-side actions to execute before rendering (e.g., send_email). These run immediately on the backend.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["send_email", "create_event", "search_drive"],
            },
            params: { type: "object" },
          },
          required: ["type", "params"],
        },
      },
    },
    required: ["layout"],
  },
};

// ─── V1 Backward Compatibility ───────────────────────────

// Old tool names → scene wrapper for backward compat
export function wrapV1Block(toolName: string, input: any): SceneNode {
  switch (toolName) {
    case "render_cards":
      return { type: "card-grid", data: input };
    case "render_comparison":
      return { type: "comparison", data: { items: input.items } };
    case "render_stats":
      return { type: "stat-cards", data: { stats: input.stats } };
    case "render_chart":
      return { type: "chart", data: input };
    case "render_timeline":
      return { type: "timeline", data: { events: input.events } };
    case "render_table":
      return { type: "table", data: { columns: input.columns, rows: input.rows } };
    case "render_email_compose":
      return { type: "email-compose", data: input };
    default:
      return { type: "text-block", data: { content: JSON.stringify(input) } };
  }
}
