"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";
import type { ChartLineData } from "@/lib/scene-v4-types";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

interface ChartLinePrimitiveProps {
  data: ChartLineData;
}

export default function ChartLinePrimitive({ data }: ChartLinePrimitiveProps) {
  const color = data.color || "#00d4aa";

  const option = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "rgba(0,0,0,0.8)",
      borderColor: "rgba(0,212,170,0.3)",
      textStyle: { color: "#fff", fontSize: 11 },
    },
    grid: { top: 20, right: 16, bottom: 30, left: 45, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: data.points.map(p => p.label),
      boundaryGap: false,
    },
    yAxis: {
      type: "value" as const,
      name: data.yLabel,
      nameTextStyle: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
    },
    series: [{
      type: "line" as const,
      data: data.points.map(p => p.value),
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { color, width: 2, shadowColor: color, shadowBlur: 10 },
      itemStyle: { color, shadowColor: color, shadowBlur: 8 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + "30" },
          { offset: 1, color: color + "00" },
        ]),
      },
      animationDuration: 1200,
      animationEasing: "cubicOut" as const,
    }],
  }), [data, color]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        theme="whut"
        style={{ height: 200, width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge
      />
    </motion.div>
  );
}
