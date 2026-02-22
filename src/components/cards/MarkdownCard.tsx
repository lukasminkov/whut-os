"use client";

export default function MarkdownCard({ data }: { data: { content: string } }) {
  // Simple markdown rendering — bold, italic, headers, links, lists
  const html = (data?.content || "")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-white/80 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-white/80 mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90 font-medium">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-[#00d4aa] hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-white/60">$1</li>')
    .replace(/\n/g, "<br/>");

  return (
    <div
      className="text-sm text-white/60 leading-relaxed max-h-[350px] overflow-y-auto custom-scrollbar prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
