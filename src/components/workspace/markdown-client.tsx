"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils/cn";

/** Client-side Markdown for content that arrives from server actions (hints, solutions). */
export function MarkdownClient({
  children,
  className,
}: {
  children: string;
  /** Overrides the default density, e.g. the business question reads one step larger. */
  className?: string;
}) {
  return (
    <div className={cn("prose-dm text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
