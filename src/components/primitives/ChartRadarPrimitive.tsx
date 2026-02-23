"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { RadarChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";

echarts.use([RadarChart, TooltipComponent, LegendComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

export interface ChartRadarData {
  indicators: { name: string; max: number }[];
  values: number[];
  label?: string;
  color?: string;
}

export default function ChartRadarPrimitive({ data }: { data: ChartRadarData }) {
  const color = data.color || "#00d4aa";

  const option = useMemo(() => ({
    tooltip: { backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(0,212,170,0.3)", textStyle: { color: "#fff" } },
    radar: {
      indicator: data.indicators,
      shape: "polygon" as const,
      splitNumber: 4,
      axisName: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      splitArea: { areaStyle: { color: ["transparent", "rgba(0,212,170,0.02)"] } },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    series: [{
      type: "radar" as const,
      data: [{ value: data.values, name: data.label || "Value" }],
      lineStyle: { color, width: 2, shadowColor: color, shadowBlur: 10 },
      itemStyle: { color, shadowColor: color, shadowBlur: 6 },
      areaStyle: { color: color + "20" },
      animationDuration: 1200,
    }],
  }), [data, color]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <ReactEChartsCore echarts={echarts} option={option} theme="whut" style={{ height: 220, width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
    </motion.div>
  );
}
