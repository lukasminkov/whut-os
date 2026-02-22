"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { TableData } from "@/lib/visualization-tools";

export default function TableView({ data }: { data: TableData }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedRows = [...data.rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey] || "";
    const bv = b[sortKey] || "";
    const cmp = av.localeCompare(bv, undefined, { numeric: true });
    return sortAsc ? cmp : -cmp;
  });

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
        {data.title}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {data.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium cursor-pointer hover:text-white/60 transition ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <motion.tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {data.columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-white/70 ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {row[col.key] || "—"}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
