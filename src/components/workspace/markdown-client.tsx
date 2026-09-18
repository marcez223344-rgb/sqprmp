"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Client-side Markdown for content that arrives from server actions (hints, solutions). */
export function MarkdownClient({ children }: { children: string }) {
  return (
    <div className="prose-dm text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
