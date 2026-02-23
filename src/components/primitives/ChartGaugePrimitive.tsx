"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { GaugeChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";

echarts.use([GaugeChart, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

export interface ChartGaugeData {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

export default function ChartGaugePrimitive({ data }: { data: ChartGaugeData }) {
  const color = data.color || "#00d4aa";
  const max = data.max || 100;

  const option = useMemo(() => ({
    series: [{
      type: "gauge" as const,
      min: 0,
      max,
      progress: { show: true, width: 12, itemStyle: { color, shadowColor: color, shadowBlur: 16 } },
      axisLine: { lineStyle: { width: 12, color: [[1, "rgba(255,255,255,0.06)"]] } },
      axisTick: { show: false },
      splitLine: { length: 8, lineStyle: { width: 1, color: "rgba(255,255,255,0.15)" } },
      axisLabel: { distance: 20, color: "rgba(255,255,255,0.3)", fontSize: 9 },
      pointer: { length: "60%", width: 4, itemStyle: { color, shadowColor: color, shadowBlur: 10 } },
      anchor: { show: true, size: 8, itemStyle: { color, shadowColor: color, shadowBlur: 10, borderWidth: 0 } },
      title: { show: true, offsetCenter: [0, "70%"], fontSize: 10, color: "rgba(255,255,255,0.4)" },
      detail: {
        valueAnimation: true,
        fontSize: 22,
        fontWeight: 300,
        offsetCenter: [0, "40%"],
        color: "#fff",
        formatter: "{value}",
      },
      data: [{ value: data.value, name: data.label || "" }],
      animationDuration: 1500,
      animationEasing: "elasticOut" as const,
    }],
  }), [data, color, max]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ReactEChartsCore echarts={echarts} option={option} theme="whut" style={{ height: 200, width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
    </motion.div>
  );
}
