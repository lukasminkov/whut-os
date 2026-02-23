"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";
import type { ChartBarData } from "@/lib/scene-v4-types";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

interface ChartBarPrimitiveProps {
  data: ChartBarData;
}

export default function ChartBarPrimitive({ data }: ChartBarPrimitiveProps) {
  const color = data.color || "#00d4aa";
  const isHorizontal = !!data.horizontal;

  const option = useMemo(() => {
    const categoryAxis = {
      type: "category" as const,
      data: data.bars.map(b => b.label),
      axisLabel: { fontSize: 9, color: "rgba(255,255,255,0.3)", rotate: isHorizontal ? 0 : 0 },
    };
    const valueAxis = { type: "value" as const };

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderColor: "rgba(0,212,170,0.3)",
        textStyle: { color: "#fff", fontSize: 11 },
      },
      grid: { top: 16, right: 16, bottom: 30, left: isHorizontal ? 80 : 40, containLabel: false },
      xAxis: isHorizontal ? valueAxis : categoryAxis,
      yAxis: isHorizontal ? categoryAxis : valueAxis,
      series: [{
        type: "bar" as const,
        data: data.bars.map(b => b.value),
        barMaxWidth: 40,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, isHorizontal ? 0 : 1, isHorizontal ? 1 : 0, 0, [
            { offset: 0, color: color + "60" },
            { offset: 1, color },
          ]),
          borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          shadowColor: color + "30",
          shadowBlur: 12,
        },
        animationDuration: 800,
        animationEasing: "cubicOut" as const,
        animationDelay: (idx: number) => idx * 60,
      }],
    };
  }, [data, color, isHorizontal]);

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
