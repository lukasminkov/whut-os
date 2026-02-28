"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react";
import type { TableData } from "@/lib/scene-v4-types";

interface TablePrimitiveProps {
  data: TableData;
  sendToAI?: (message: string) => void;
}

type SortDir = "asc" | "desc" | null;

export default function TablePrimitive({ data, sendToAI }: TablePrimitiveProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleSort = useCallback((colIndex: number) => {
    if (sortCol === colIndex) {
      setSortDir(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(colIndex);
      setSortDir("asc");
    }
  }, [sortCol, sortDir]);

  const filteredAndSorted = useMemo(() => {
    let rows = [...data.rows];

    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)));
    }

    // Sort
    if (sortCol !== null && sortDir) {
      rows.sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        const numA = typeof av === "number" ? av : parseFloat(String(av));
        const numB = typeof bv === "number" ? bv : parseFloat(String(bv));
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === "asc" ? numA - numB : numB - numA;
        }
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [data.rows, search, sortCol, sortDir]);

  const handleRowClick = useCallback((rowIndex: number) => {
    setExpandedRow(prev => prev === rowIndex ? null : rowIndex);
  }, []);

  const handleDrillDown = useCallback((row: (string | number)[]) => {
    if (sendToAI) {
      const details = data.columns.map((col, i) => `${col}: ${row[i]}`).join(", ");
      sendToAI(`Tell me more about this row: ${details}`);
    }
  }, [sendToAI, data.columns]);

  const SortIcon = ({ colIndex }: { colIndex: number }) => {
    if (sortCol !== colIndex) return <ChevronsUpDown size={10} className="text-white/20 ml-1 inline" />;
    if (sortDir === "asc") return <ChevronUp size={10} className="text-[#00d4aa] ml-1 inline" />;
    return <ChevronDown size={10} className="text-[#00d4aa] ml-1 inline" />;
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${data.rows.length} rows...`}
          className="w-full pl-7 pr-7 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-md text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#00d4aa]/30 transition"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Table with sticky header */}
      <div className="overflow-auto scrollbar-thin max-h-[400px] rounded-md border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10" style={{ background: "rgba(8,12,20,0.95)", backdropFilter: "blur(8px)" }}>
            <tr className="border-b border-white/[0.08]">
              {data.columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="text-left text-[10px] text-white/40 uppercase tracking-[0.15em] px-3 py-2 font-normal cursor-pointer hover:text-white/60 select-none transition"
                >
                  {col}
                  <SortIcon colIndex={i} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, ri) => (
              <motion.tr
                key={ri}
                className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors cursor-pointer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(ri * 0.02, 0.5) }}
                onClick={() => handleRowClick(ri)}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-white/60 tabular-nums">
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
            {filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={data.columns.length} className="px-3 py-6 text-center text-white/20 text-xs">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded row detail */}
      <AnimatePresence>
        {expandedRow !== null && filteredAndSorted[expandedRow] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-[#00d4aa]/15 overflow-hidden"
            style={{ background: "rgba(8,12,20,0.8)", backdropFilter: "blur(8px)" }}
          >
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Row Details</p>
              <div className="grid grid-cols-2 gap-2">
                {data.columns.map((col, i) => (
                  <div key={i}>
                    <span className="text-[10px] text-white/30">{col}</span>
                    <p className="text-sm text-white/80">{filteredAndSorted[expandedRow][i]}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                {sendToAI && (
                  <button
                    onClick={() => handleDrillDown(filteredAndSorted[expandedRow])}
                    className="text-[10px] px-2.5 py-1 rounded bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25 transition"
                  >
                    Drill Down
                  </button>
                )}
                <button
                  onClick={() => setExpandedRow(null)}
                  className="text-[10px] px-2.5 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row count */}
      {search && (
        <p className="text-[10px] text-white/20">
          {filteredAndSorted.length} of {data.rows.length} rows
        </p>
      )}
    </div>
  );
}
