"use client";

import { motion } from "framer-motion";
import { detectIntent } from "@/lib/intent-prefetch";

type SkeletonType = "list" | "metric" | "detail" | "chart" | "generic";

interface SkeletonCardsProps {
  query: string;
}

function intentToSkeletons(query: string): SkeletonType[] {
  const detected = detectIntent(query);
  if (!detected) return ["generic"];

  switch (detected.intent) {
    case "check_email":
      return ["list"];
    case "check_calendar":
      return ["list"];
    case "morning_briefing":
      return ["list", "list"];
    case "finances":
      return ["metric", "chart"];
    case "check_files":
      return ["list"];
    default:
      return ["generic"];
  }
}

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={`rounded-lg bg-white/[0.06] ${className || ""}`}
      style={style}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <SkeletonPulse className="h-5 w-32" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <SkeletonPulse className="h-3.5 w-3/4" />
            <SkeletonPulse className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6">
      <SkeletonPulse className="h-3 w-20" />
      <SkeletonPulse className="h-10 w-28" />
      <SkeletonPulse className="h-3 w-16" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <SkeletonPulse className="h-4 w-24" />
      <div className="flex items-end gap-2 h-32">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 70}%` } as any}
          />
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <SkeletonPulse className="h-5 w-48" />
      <SkeletonPulse className="h-3 w-32" />
      <div className="mt-2 flex flex-col gap-2">
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-3/4" />
        <SkeletonPulse className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <SkeletonPulse className="h-4 w-36" />
      <SkeletonPulse className="h-3 w-full" />
      <SkeletonPulse className="h-3 w-4/5" />
      <SkeletonPulse className="h-3 w-2/3" />
    </div>
  );
}

const SKELETON_MAP: Record<SkeletonType, () => React.ReactNode> = {
  list: ListSkeleton,
  metric: MetricSkeleton,
  chart: ChartSkeleton,
  detail: DetailSkeleton,
  generic: GenericSkeleton,
};

export default function SkeletonCards({ query }: SkeletonCardsProps) {
  const types = intentToSkeletons(query);

  return (
    <div className="relative z-10 px-4 md:px-8 pb-24 pt-4 flex items-start justify-center">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: types.length === 1 ? "minmax(0, 560px)" : `repeat(${Math.min(types.length, 3)}, minmax(0, 1fr))`,
          gap: "20px",
          maxWidth: types.length === 1 ? "600px" : "1100px",
          width: "100%",
        }}
      >
        {types.map((type, i) => {
          const Skeleton = SKELETON_MAP[type];
          return (
            <motion.div
              key={i}
              className="rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                background: "rgba(8, 12, 20, 0.65)",
                backdropFilter: "blur(40px)",
              }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Skeleton />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
