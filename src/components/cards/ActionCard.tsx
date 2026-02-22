"use client";

export default function ActionCard({ data }: { data: { label: string; action?: string } }) {
  return (
    <div className="flex justify-center py-4">
      <button className="px-5 py-2.5 rounded-xl bg-[#00d4aa]/20 text-[#00d4aa] text-sm font-medium hover:bg-[#00d4aa]/30 transition-colors">
        {data?.label || "Action"}
      </button>
    </div>
  );
}
