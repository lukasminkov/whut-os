"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { CandlestickChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";

echarts.use([CandlestickChart, GridComponent, TooltipComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

export interface ChartCandlestickData {
  labels: string[];
  /** Each item: [open, close, low, high] */
  values: [number, number, number, number][];
  label?: string;
}

export default function ChartCandlestickPrimitive({ data }: { data: ChartCandlestickData }) {
  const option = useMemo(() => ({
    tooltip: { trigger: "axis" as const, backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(0,212,170,0.3)", textStyle: { color: "#fff" } },
    grid: { top: 16, right: 16, bottom: 30, left: 50 },
    xAxis: { type: "category" as const, data: data.labels },
    yAxis: { type: "value" as const, scale: true },
    series: [{
      type: "candlestick" as const,
      data: data.values,
      itemStyle: {
        color: "#00d4aa",
        color0: "#ff6b6b",
        borderColor: "#00d4aa",
        borderColor0: "#ff6b6b",
        shadowBlur: 8,
        shadowColor: "rgba(0,212,170,0.2)",
      },
      animationDuration: 1000,
    }],
  }), [data]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <ReactEChartsCore echarts={echarts} option={option} theme="whut" style={{ height: 220, width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
    </motion.div>
  );
}
