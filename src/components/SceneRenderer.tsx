"use client";

import { motion } from "framer-motion";
import type { SceneNode } from "@/lib/scene-types";
import { isLayoutNode } from "@/lib/scene-types";
import { useDataSlot } from "@/hooks/useDataSlot";

// Component imports
import StatCards from "./visualizations/StatCards";
import CardGrid from "./visualizations/CardGrid";
import ComparisonView from "./visualizations/ComparisonView";
import ChartView from "./visualizations/ChartView";
import TimelineView from "./visualizations/TimelineView";
import TableView from "./visualizations/TableView";
import EmailCompose from "./EmailCompose";
import EmailList from "./visualizations/EmailList";
import CalendarEvents from "./visualizations/CalendarEvents";
import FileList from "./visualizations/FileList";
import CommerceSummary from "./visualizations/CommerceSummary";
import TextBlock from "./visualizations/TextBlock";
import MarkdownBlock from "./visualizations/MarkdownBlock";

// ─── Skeleton Shimmer ───────────────────────────────────────────

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

function SkeletonForType({ type, label }: { type: string; label?: string }) {
  return (
    <div className="glass-card p-5 space-y-3 min-h-[120px]">
      {label && (
        <motion.p
          className="text-xs text-white/30 uppercase tracking-[0.2em]"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {label}
        </motion.p>
      )}
      {type === "email-list" && (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <Shimmer className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-[40%]" />
                <Shimmer className="h-3 w-[75%]" />
                <Shimmer className="h-2.5 w-[60%]" />
              </div>
              <Shimmer className="h-2.5 w-12 shrink-0" />
            </div>
          ))}
        </div>
      )}
      {type === "calendar-events" && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Shimmer className="w-12 h-10 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-[55%]" />
                <Shimmer className="h-2.5 w-[35%]" />
              </div>
            </div>
          ))}
        </div>
      )}
      {type === "file-list" && (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Shimmer className="w-8 h-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-[50%]" />
                <Shimmer className="h-2.5 w-[30%]" />
              </div>
            </div>
          ))}
        </div>
      )}
      {type === "chart" && <Shimmer className="h-[200px] w-full rounded-lg" />}
      {type === "stat-cards" && (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}
      {type === "table" && (
        <div className="space-y-2">
          <Shimmer className="h-8 w-full rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      )}
      {type === "commerce-summary" && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}
      {/* Default fallback skeleton */}
      {!["email-list", "calendar-events", "file-list", "chart", "stat-cards", "table", "commerce-summary"].includes(type) && (
        <div className="space-y-2">
          <Shimmer className="h-4 w-[60%]" />
          <Shimmer className="h-4 w-[80%]" />
          <Shimmer className="h-4 w-[45%]" />
        </div>
      )}
    </div>
  );
}

// ─── Component Leaf Renderer ────────────────────────────────────

function ComponentLeaf({ node, index }: { node: SceneNode; index: number }) {
  const { data: fetchedData, isLoading, error } = useDataSlot(node.dataSource);
  const resolvedData = node.data ?? fetchedData;

  // Show skeleton while loading
  if (node.dataSource && isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.04 }}
      >
        <SkeletonForType type={node.type} label={node.loading} />
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        className="glass-card p-4 border-rose-500/20"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <p className="text-xs text-rose-400/70">Failed to load: {error}</p>
      </motion.div>
    );
  }

  // Render component
  const content = (() => {
    switch (node.type) {
      case "stat-cards":
        return <StatCards data={resolvedData} />;
      case "email-list":
        return <EmailList data={resolvedData} title={node.title} />;
      case "calendar-events":
        return <CalendarEvents data={resolvedData} title={node.title} />;
      case "file-list":
        return <FileList data={resolvedData} title={node.title} />;
      case "chart":
        return <ChartView data={resolvedData} />;
      case "card-grid":
        return <CardGrid data={resolvedData} />;
      case "comparison":
        return <ComparisonView data={resolvedData} />;
      case "table":
        return <TableView data={resolvedData} />;
      case "timeline":
        return <TimelineView data={resolvedData} />;
      case "text-block":
        return <TextBlock data={resolvedData} />;
      case "markdown":
        return <MarkdownBlock data={resolvedData} />;
      case "email-compose":
        return <EmailCompose data={resolvedData} />;
      case "commerce-summary":
        return <CommerceSummary data={resolvedData} title={node.title} />;
      case "action-button":
        return (
          <button className="glass-button px-5 py-2.5 text-sm font-medium text-white/90 hover:text-white transition-all">
            {resolvedData?.label || "Action"}
          </button>
        );
      default:
        return <div className="text-xs text-white/30">Unknown: {node.type}</div>;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.45,
        type: "spring",
        damping: 22,
        stiffness: 180,
      }}
      style={node.minHeight ? { minHeight: node.minHeight } : undefined}
    >
      {content}
    </motion.div>
  );
}

// ─── Layout Node Renderer ───────────────────────────────────────

function LayoutNodeRenderer({ node, index }: { node: SceneNode; index: number }) {
  const gap = node.gap ?? 12;

  let style: React.CSSProperties = {};
  let className = "";

  if (node.type === "grid") {
    const cols = node.columns ?? 2;
    style = {
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${gap}px`,
    };
    // Responsive: collapse to fewer columns on smaller screens
    className = "scene-grid";
  } else if (node.type === "flex") {
    style = {
      display: "flex",
      flexDirection: node.direction === "col" ? "column" : "row",
      gap: `${gap}px`,
      flexWrap: "wrap",
    };
  } else if (node.type === "stack") {
    style = {
      display: "flex",
      flexDirection: "column",
      gap: `${gap}px`,
    };
  }

  return (
    <motion.div
      style={style}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      {node.children?.map((child, i) => (
        <SceneNodeRenderer key={child.id ?? `node-${i}`} node={child} index={i} />
      ))}
    </motion.div>
  );
}

// ─── Recursive Node Renderer ────────────────────────────────────

function SceneNodeRenderer({ node, index }: { node: SceneNode; index: number }) {
  // Grid-column spanning
  const spanStyle: React.CSSProperties = node.span
    ? { gridColumn: `span ${node.span} / span ${node.span}` }
    : {};

  if (isLayoutNode(node)) {
    return (
      <div style={spanStyle}>
        <LayoutNodeRenderer node={node} index={index} />
      </div>
    );
  }

  return (
    <div style={spanStyle}>
      <ComponentLeaf node={node} index={index} />
    </div>
  );
}

// ─── SceneRenderer (entry point) ────────────────────────────────

interface SceneRendererProps {
  scene: SceneNode;
}

export default function SceneRenderer({ scene, onClose }: SceneRendererProps & { onClose?: () => void }) {
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
    >
      {onClose && (
        <motion.button
          onClick={onClose}
          className="mb-4 flex items-center gap-2 text-xs text-white/30 hover:text-white/70 transition-colors group"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="inline-block w-6 h-6 rounded-full border border-white/10 group-hover:border-white/30 flex items-center justify-center transition-colors text-[10px]">✕</span>
          <span className="uppercase tracking-[0.2em]">Close</span>
        </motion.button>
      )}
      <SceneNodeRenderer node={scene} index={0} />
    </motion.div>
  );
}
