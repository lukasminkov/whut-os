"use client";
import { useRef, useEffect } from "react";

interface ChartData {
  chartType?: "line" | "bar" | "area";
  data: { label: string; value: number }[];
  color?: string;
}

export default function ChartCard({ data }: { data: ChartData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartType = data?.chartType || "line";
  const points = data?.data || [];
  const color = data?.color || "#00d4aa";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...points.map(p => p.value), 1);
    const pad = { top: 20, bottom: 30, left: 10, right: 10 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    const getX = (i: number) => pad.left + (cw / Math.max(points.length - 1, 1)) * i;
    const getY = (v: number) => pad.top + ch - (v / maxVal) * ch;

    if (chartType === "bar") {
      const barW = Math.max(cw / points.length - 4, 6);
      points.forEach((p, i) => {
        const x = getX(i) - barW / 2;
        const y = getY(p.value);
        const barH = pad.top + ch - y;
        ctx.fillStyle = color + "80";
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 3);
        ctx.fill();
      });
    } else {
      // Line / Area
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = getX(i);
        const y = getY(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (chartType === "area") {
        ctx.lineTo(getX(points.length - 1), pad.top + ch);
        ctx.lineTo(getX(0), pad.top + ch);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
        grad.addColorStop(0, color + "40");
        grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad;
        ctx.fill();
        // Redraw line on top
        ctx.beginPath();
        points.forEach((p, i) => {
          const x = getX(i);
          const y = getY(p.value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(getX(i), getY(p.value), 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }

    // Labels
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    const labelStep = Math.ceil(points.length / 6);
    points.forEach((p, i) => {
      if (i % labelStep === 0 || i === points.length - 1) {
        ctx.fillText(p.label, getX(i), h - 8);
      }
    });
  }, [points, chartType, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[200px]"
      style={{ width: "100%", height: 200 }}
    />
  );
}
