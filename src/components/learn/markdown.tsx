import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionHeader, type SectionCategory } from "@/components/ui/section-header";

/**
 * The nine recurring pedagogy headings of the curriculum, keyed by heading text so that no
 * content file changes. They account for ~250 of the ~700 `##` headings in the lessons and repeat
 * in the same position lesson after lesson, which is what turns four fixed icons into navigation
 * instead of decoration (review 2026-09-23 §2.3). Everything else keeps the plain treatment.
 */
const PROSE_SECTION: Record<string, SectionCategory> = {
  "por que importa": "why",
  "el concepto": "concept",
  "la sintaxis": "concept",
  "ejemplo resuelto": "example",
  "ejemplo ejecutable": "example",
  "errores comunes": "pitfall",
  "errores frecuentes": "pitfall",
  verificar: "verify",
  "verificar el resultado": "verify",
  resumen: "summary",
  "en resumen": "summary",
};

/** Case- and accent-insensitive, tolerant of a trailing colon, so a small drift still matches. */
export function normalizeHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:.]+$/, "")
    .trim();
}

/** Heading text for matching only; the rendered children stay untouched. */
function plainText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return plainText(child.props.children);
      return "";
    })
    .join("");
}

export function headingCategory(text: string): SectionCategory | null {
  return PROSE_SECTION[normalizeHeading(text)] ?? null;
}

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
          /**
           * Every `h2` gets a top rule: that rhythm is what a 2 000-word column was missing. The
           * icon is decoration — `aria-hidden`, outside the heading's text — so the accessible
           * name of the heading is exactly the authored title.
           */
          h2: ({ children }) => {
            const category = headingCategory(plainText(children));
            const rule = "border-border mt-10 border-t pt-8 first:mt-0 first:border-t-0 first:pt-0";
            return category ? (
              <SectionHeader
                wrapper="div"
                as="h2"
                category={category}
                title={children}
                className={rule}
                titleClassName="text-[1.375rem] font-semibold"
              />
            ) : (
              <h2 className={`${rule} text-[1.375rem] font-semibold`}>{children}</h2>
            );
          },
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
