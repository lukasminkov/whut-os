"use client";

export default function ContentCard({ data }: { data: { text: string } }) {
  return (
    <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto custom-scrollbar">
      {data?.text || ""}
    </div>
  );
}
