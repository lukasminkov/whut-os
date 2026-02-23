"use client";

import { motion } from "framer-motion";

/** Brief radial pulse shown during scene transitions */
export default function ProcessingPulse() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <motion.div
        className="w-32 h-32 rounded-full border border-[#00d4aa]/20"
        initial={{ scale: 0.3, opacity: 0.8 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ boxShadow: "0 0 40px rgba(0,212,170,0.15)" }}
      />
    </motion.div>
  );
}
