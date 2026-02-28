"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";
import type { ChartLineData } from "@/lib/scene-v4-types";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

interface ChartLinePrimitiveProps {
  data: ChartLineData;
  onDataPointClick?: (point: { label: string; value: number; index: number }) => void;
  sendToAI?: (message: string) => void;
}

export default function ChartLinePrimitive({ data, onDataPointClick, sendToAI }: ChartLinePrimitiveProps) {
  const color = data.color || "#00d4aa";
  const chartRef = useRef<any>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ label: string; value: number; index: number; x: number; y: number } | null>(null);

  const handleClick = useCallback((params: any) => {
    if (params.componentType === "series") {
      const point = { label: data.points[params.dataIndex].label, value: data.points[params.dataIndex].value, index: params.dataIndex };
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        const pixel = chart.convertToPixel({ seriesIndex: 0 }, [params.dataIndex, params.value]);
        setSelectedPoint({ ...point, x: pixel?.[0] ?? params.event?.offsetX ?? 0, y: pixel?.[1] ?? params.event?.offsetY ?? 0 });
      }
      onDataPointClick?.(point);
    }
  }, [data.points, onDataPointClick]);

  const handleDrillDown = useCallback(() => {
    if (selectedPoint && sendToAI) {
      sendToAI(`Tell me more about the data point "${selectedPoint.label}" with value ${selectedPoint.value}`);
    }
    setSelectedPoint(null);
  }, [selectedPoint, sendToAI]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "rgba(0,0,0,0.85)",
      borderColor: "rgba(0,212,170,0.3)",
      textStyle: { color: "#fff", fontSize: 11 },
    },
    grid: { top: 20, right: 16, bottom: 50, left: 45, containLabel: false },
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
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      {
        type: "slider", xAxisIndex: 0, height: 18, bottom: 4,
        borderColor: "rgba(0,212,170,0.15)",
        backgroundColor: "rgba(0,0,0,0.2)",
        fillerColor: "rgba(0,212,170,0.08)",
        handleStyle: { color: "#00d4aa", borderColor: "#00d4aa" },
        textStyle: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
        dataBackground: { lineStyle: { color: "rgba(0,212,170,0.2)" }, areaStyle: { color: "rgba(0,212,170,0.05)" } },
      },
    ],
    series: [{
      type: "line" as const,
      data: data.points.map(p => p.value),
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      emphasis: { itemStyle: { borderWidth: 3, borderColor: "#fff", shadowBlur: 16, shadowColor: color } },
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

  const onEvents = useMemo(() => ({ click: handleClick }), [handleClick]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 relative">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={option}
        theme="whut"
        style={{ height: 220, width: "100%" }}
        opts={{ renderer: "canvas" }}
        onEvents={onEvents}
        notMerge
      />
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 rounded-lg border border-[#00d4aa]/20 p-3 min-w-[160px]"
            style={{
              background: "rgba(8,12,20,0.92)", backdropFilter: "blur(12px)",
              left: Math.min(selectedPoint.x, 200), top: Math.max(selectedPoint.y - 80, 20),
            }}
          >
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{selectedPoint.label}</p>
            <p className="text-lg font-semibold text-white">{selectedPoint.value.toLocaleString()}</p>
            <div className="flex gap-2 mt-2">
              {sendToAI && (
                <button onClick={handleDrillDown} className="text-[10px] px-2 py-1 rounded bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25 transition">
                  Drill Down
                </button>
              )}
              <button onClick={() => setSelectedPoint(null)} className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 transition">
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
