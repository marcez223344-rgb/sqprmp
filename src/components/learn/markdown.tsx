import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders authored Markdown (lessons, prompts, explanations). Content is authored in-repo
 * and validated, so raw HTML is disabled and links open safely.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ?? "prose-dm"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              rel="noreferrer"
              target={href?.startsWith("http") ? "_blank" : undefined}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          code: ({ className: cls, children }) => {
            const isBlock = typeof cls === "string" && cls.startsWith("language-");
            return isBlock ? (
              <code className={cls}>{children}</code>
            ) : (
              <code className="inline-code">{children}</code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
