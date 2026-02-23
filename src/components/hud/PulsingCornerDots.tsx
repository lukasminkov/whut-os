"use client";

import { motion } from "framer-motion";

const positions = [
  { top: 3, left: 3 },
  { top: 3, right: 3 },
  { bottom: 3, left: 3 },
  { bottom: 3, right: 3 },
] as const;

export default function PulsingCornerDots() {
  return (
    <>
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-[3px] h-[3px] rounded-full bg-[#00d4aa] pointer-events-none"
          style={pos as any}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}
