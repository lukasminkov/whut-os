"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { VisualizationBlock } from "@/lib/visualization-tools";
import CardGrid from "./visualizations/CardGrid";
import ComparisonView from "./visualizations/ComparisonView";
import StatCards from "./visualizations/StatCards";
import ChartView from "./visualizations/ChartView";
import TimelineView from "./visualizations/TimelineView";
import TableView from "./visualizations/TableView";

interface Props {
  blocks: VisualizationBlock[];
}

export default function VisualizationEngine({ blocks }: Props) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return (
              <motion.div
                key={i}
                className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </motion.div>
            );
          case "render_cards":
            return <CardGrid key={i} data={block.data} />;
          case "render_comparison":
            return <ComparisonView key={i} data={block.data} />;
          case "render_stats":
            return <StatCards key={i} data={block.data} />;
          case "render_chart":
            return <ChartView key={i} data={block.data} />;
          case "render_timeline":
            return <TimelineView key={i} data={block.data} />;
          case "render_table":
            return <TableView key={i} data={block.data} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
