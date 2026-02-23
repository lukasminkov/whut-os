"use client";

import { motion } from "framer-motion";
import type { TableData } from "@/lib/scene-v4-types";

interface TablePrimitiveProps {
  data: TableData;
}

export default function TablePrimitive({ data }: TablePrimitiveProps) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {data.columns.map((col, i) => (
              <th key={i} className="text-left text-[10px] text-white/40 uppercase tracking-[0.15em] px-3 py-2 font-normal">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <motion.tr
              key={ri}
              className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: ri * 0.03 }}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-white/60 tabular-nums">
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
