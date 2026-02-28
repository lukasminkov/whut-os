"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { whutEChartsTheme } from "@/lib/echarts-theme";
import type { ChartBarData } from "@/lib/scene-v4-types";

echarts.use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);
echarts.registerTheme("whut", whutEChartsTheme as any);

interface ChartBarPrimitiveProps {
  data: ChartBarData;
  onDataPointClick?: (point: { label: string; value: number; index: number }) => void;
  sendToAI?: (message: string) => void;
}

export default function ChartBarPrimitive({ data, onDataPointClick, sendToAI }: ChartBarPrimitiveProps) {
  const color = data.color || "#00d4aa";
  const isHorizontal = !!data.horizontal;
  const chartRef = useRef<any>(null);
  const [selectedBar, setSelectedBar] = useState<{ label: string; value: number; index: number; x: number; y: number } | null>(null);

  const handleClick = useCallback((params: any) => {
    if (params.componentType === "series") {
      const bar = { label: data.bars[params.dataIndex].label, value: data.bars[params.dataIndex].value, index: params.dataIndex };
      setSelectedBar({ ...bar, x: params.event?.offsetX ?? 100, y: params.event?.offsetY ?? 100 });
      onDataPointClick?.(bar);
    }
  }, [data.bars, onDataPointClick]);

  const handleDrillDown = useCallback(() => {
    if (selectedBar && sendToAI) {
      sendToAI(`Tell me more about "${selectedBar.label}" with value ${selectedBar.value}`);
    }
    setSelectedBar(null);
  }, [selectedBar, sendToAI]);

  const option = useMemo(() => {
    const categoryAxis = {
      type: "category" as const,
      data: data.bars.map(b => b.label),
      axisLabel: { fontSize: 9, color: "rgba(255,255,255,0.3)" },
    };
    const valueAxis = { type: "value" as const };

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(0,0,0,0.85)",
        borderColor: "rgba(0,212,170,0.3)",
        textStyle: { color: "#fff", fontSize: 11 },
      },
      grid: { top: 16, right: 16, bottom: isHorizontal ? 30 : 50, left: isHorizontal ? 80 : 40, containLabel: false },
      xAxis: isHorizontal ? valueAxis : categoryAxis,
      yAxis: isHorizontal ? categoryAxis : valueAxis,
      dataZoom: isHorizontal ? [] : [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider", xAxisIndex: 0, height: 18, bottom: 4,
          borderColor: "rgba(0,212,170,0.15)", backgroundColor: "rgba(0,0,0,0.2)",
          fillerColor: "rgba(0,212,170,0.08)",
          handleStyle: { color: "#00d4aa", borderColor: "#00d4aa" },
          textStyle: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
        },
      ],
      series: [{
        type: "bar" as const,
        data: data.bars.map(b => b.value),
        barMaxWidth: 40,
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: color + "60" } },
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
        {selectedBar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 rounded-lg border border-[#00d4aa]/20 p-3 min-w-[160px]"
            style={{
              background: "rgba(8,12,20,0.92)", backdropFilter: "blur(12px)",
              left: Math.min(selectedBar.x, 200), top: Math.max(selectedBar.y - 80, 20),
            }}
          >
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{selectedBar.label}</p>
            <p className="text-lg font-semibold text-white">{selectedBar.value.toLocaleString()}</p>
            <div className="flex gap-2 mt-2">
              {sendToAI && (
                <button onClick={handleDrillDown} className="text-[10px] px-2 py-1 rounded bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25 transition">
                  Drill Down
                </button>
              )}
              <button onClick={() => setSelectedBar(null)} className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 transition">
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
