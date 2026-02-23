"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { ChartLineData } from "@/lib/scene-v4-types";

interface ChartLinePrimitiveProps {
  data: ChartLineData;
}

export default function ChartLinePrimitive({ data }: ChartLinePrimitiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.points.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 16, bottom: 30, left: 40 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const values = data.points.map(p => p.value);
    const minV = Math.min(...values) * 0.9;
    const maxV = Math.max(...values) * 1.1;
    const rangeV = maxV - minV || 1;

    const color = data.color || "#00d4aa";

    const points = data.points.map((p, i) => ({
      x: pad.left + (i / Math.max(data.points.length - 1, 1)) * plotW,
      y: pad.top + plotH - ((p.value - minV) / rangeV) * plotH,
    }));

    let progress = 0;
    const startTime = performance.now();
    const duration = 1200;

    function draw(now: number) {
      progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const visibleCount = Math.ceil(eased * points.length);

      ctx!.clearRect(0, 0, w, h);

      // Grid lines
      ctx!.strokeStyle = "rgba(255,255,255,0.04)";
      ctx!.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (plotH / 4) * i;
        ctx!.beginPath();
        ctx!.moveTo(pad.left, y);
        ctx!.lineTo(w - pad.right, y);
        ctx!.stroke();
      }

      // Labels
      ctx!.fillStyle = "rgba(255,255,255,0.25)";
      ctx!.font = "10px system-ui";
      ctx!.textAlign = "center";
      const labelStep = Math.max(1, Math.floor(data.points.length / 6));
      for (let i = 0; i < data.points.length; i += labelStep) {
        ctx!.fillText(data.points[i].label, points[i].x, h - 8);
      }

      // Y labels
      ctx!.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const val = minV + (rangeV / 4) * (4 - i);
        ctx!.fillText(val.toFixed(0), pad.left - 6, pad.top + (plotH / 4) * i + 3);
      }

      if (visibleCount < 2) {
        if (progress < 1) animRef.current = requestAnimationFrame(draw);
        return;
      }

      const visible = points.slice(0, visibleCount);

      // Gradient fill
      const grad = ctx!.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      grad.addColorStop(0, color + "20");
      grad.addColorStop(1, color + "00");

      ctx!.beginPath();
      ctx!.moveTo(visible[0].x, pad.top + plotH);
      for (const p of visible) ctx!.lineTo(p.x, p.y);
      ctx!.lineTo(visible[visible.length - 1].x, pad.top + plotH);
      ctx!.closePath();
      ctx!.fillStyle = grad;
      ctx!.fill();

      // Line
      ctx!.beginPath();
      ctx!.moveTo(visible[0].x, visible[0].y);
      for (let i = 1; i < visible.length; i++) ctx!.lineTo(visible[i].x, visible[i].y);
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2;
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 8;
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // Endpoint dot
      const last = visible[visible.length - 1];
      ctx!.beginPath();
      ctx!.arc(last.x, last.y, 3, 0, Math.PI * 2);
      ctx!.fillStyle = color;
      ctx!.fill();

      if (progress < 1) animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <canvas ref={canvasRef} className="w-full h-[200px]" style={{ width: "100%", height: 200 }} />
    </motion.div>
  );
}
