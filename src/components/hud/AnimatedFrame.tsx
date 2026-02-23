"use client";

import { motion } from "framer-motion";

const SIZE = 18;
const STROKE = "rgba(0,212,170,0.45)";
const SW = 1.5;
const draw = { hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1 } };

function Corner({ pos, delay }: { pos: "tl" | "tr" | "bl" | "br"; delay: number }) {
  const style: React.CSSProperties = {
    position: "absolute", width: SIZE, height: SIZE, pointerEvents: "none",
    ...(pos === "tl" ? { top: -1, left: -1 } : {}),
    ...(pos === "tr" ? { top: -1, right: -1 } : {}),
    ...(pos === "bl" ? { bottom: -1, left: -1 } : {}),
    ...(pos === "br" ? { bottom: -1, right: -1 } : {}),
  };
  const paths: Record<string, string> = {
    tl: `M0,${SIZE} L0,0 L${SIZE},0`,
    tr: `M0,0 L${SIZE},0 L${SIZE},${SIZE}`,
    bl: `M0,0 L0,${SIZE} L${SIZE},${SIZE}`,
    br: `M${SIZE},0 L${SIZE},${SIZE} L0,${SIZE}`,
  };
  return (
    <svg style={style} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <motion.path
        d={paths[pos]} fill="none" stroke={STROKE} strokeWidth={SW}
        variants={draw} initial="hidden" animate="visible"
        transition={{ duration: 0.6, ease: "easeOut", delay }}
        style={{ filter: "drop-shadow(0 0 4px rgba(0,212,170,0.3))" }}
      />
    </svg>
  );
}

/** Animated HUD frame that draws in from corners */
export default function AnimatedFrame() {
  return (
    <>
      <Corner pos="tl" delay={0} />
      <Corner pos="tr" delay={0.08} />
      <Corner pos="bl" delay={0.12} />
      <Corner pos="br" delay={0.18} />
    </>
  );
}
