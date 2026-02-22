"use client";

import ReactMarkdown from "react-markdown";

export default function MarkdownCard({ data }: { data: { content: string } }) {
  const content = data?.content || "";

  return (
    <div className="max-h-[400px] overflow-y-auto custom-scrollbar prose-dark">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-white/90 mt-4 mb-2 leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-white/80 mt-4 mb-1.5 leading-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-white/80 mt-3 mb-1 leading-tight">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-white/70 mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-white/60 leading-relaxed mb-2">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-white/90 font-medium">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-white/70 italic">{children}</em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1 my-2 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 my-2 ml-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-white/60 leading-relaxed flex gap-2">
              <span className="text-white/20 mt-0.5 shrink-0">•</span>
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/30 pl-3 my-3 text-white/50 italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <div className="my-3 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.06] overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-white/[0.06] text-[10px] text-white/25 uppercase tracking-wider">
                    {className?.replace("language-", "") || "code"}
                  </div>
                  <pre className="p-3 overflow-x-auto">
                    <code className="text-xs text-white/70 font-mono leading-relaxed">{children}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="text-xs text-cyan-300/80 bg-white/[0.06] px-1.5 py-0.5 rounded-md font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          hr: () => <hr className="my-4 border-white/[0.08]" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left text-xs text-white/50 font-medium px-3 py-2 border-b border-white/[0.08] bg-white/[0.03]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="text-sm text-white/60 px-3 py-2 border-b border-white/[0.04]">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
