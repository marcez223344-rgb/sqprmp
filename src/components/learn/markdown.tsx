import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionHeader, type SectionCategory } from "@/components/ui/section-header";
import { LESSON_BLOCK_LABELS, type LessonBlockLabels } from "@/content/lesson-block-labels";
import { LESSON_DIAGRAMS } from "./diagrams";
import { CodeFigure, DiagramFigure, KeyIdea, Objectives, ResultTable } from "./lesson-blocks";

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
  // Closes the last theory lesson of each section: what was learnt and what comes next is
  // progress, so it takes the achievement hue of «Al terminar vas a poder» (DESIGN_SYSTEM §5a).
  "proximos pasos": "goal",
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

/* ------------------------------------------------------------------------------------------- *
 * Authored block vocabulary
 *
 * A lesson is Markdown, so the extra blocks are fenced blocks with an info string. That keeps the
 * content files plain Markdown (no HTML — `skipHtml` stays on), adds no dependency, and lets the
 * renderer own every pixel of the result:
 *
 *   ```objetivos              one outcome per line
 *   ```clave                  the one sentence of the lesson (inline Markdown allowed)
 *   ```sql Caption            a coloured, captioned query
 *   ```sql-mal Caption        the discouraged version of a query
 *   ```sql-bien Caption       the recommended version
 *   ```resultado Caption      pipe-separated rows; the first one is the header
 *   ```diagrama nombre[#arg]  a figure from `LESSON_DIAGRAMS`; the body is its text alternative
 *
 * `docs/DESIGN_SYSTEM.md` §5b is the authority; `docs/CONTENT_GUIDELINES.md` tells authors when to
 * reach for each one.
 * ------------------------------------------------------------------------------------------- */

/**
 * `mdast-util-to-hast` keeps a fence's info string only in `node.data.meta`, and drops the
 * language entirely when there is no `language-*` class to build. This plugin copies both onto the
 * `<code>` element as data attributes, which also gives the renderer a reliable way to tell a
 * fenced block from an inline span. Written inline rather than pulling `unist-util-visit`.
 */
interface MdastNode {
  type: string;
  lang?: string | null;
  meta?: string | null;
  data?: { hProperties?: Record<string, string> };
  children?: MdastNode[];
}

function remarkFenceInfo() {
  return (tree: MdastNode) => {
    const walk = (node: MdastNode) => {
      if (node.type === "code") {
        node.data = {
          ...node.data,
          hProperties: {
            ...node.data?.hProperties,
            "data-fence": node.lang ?? "text",
            "data-meta": node.meta ?? "",
          },
        };
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
    return tree;
  };
}

const PLUGINS = [remarkGfm, remarkFenceInfo] as ComponentProps<
  typeof ReactMarkdown
>["remarkPlugins"];

/** Splits `nombre#argumento` from a diagram fence's info string. */
function parseDiagramRef(meta: string): { name: string; argument: string | null } {
  const [name = "", argument = null] = meta.trim().split("#");
  return { name: name.trim(), argument };
}

/** `a | b | c` rows, ignoring the `---|---` separator so a pasted Markdown table also works. */
function parsePipeTable(body: string): { header: string[]; rows: string[][] } {
  const lines = body
    .trim()
    .split("\n")
    .map((line) => line.trim().replace(/^\||\|$/g, ""))
    .filter((line) => line.length > 0 && !/^[\s|:-]+$/.test(line));
  const cells = lines.map((line) => line.split("|").map((cell) => cell.trim()));
  const [header = [], ...rows] = cells;
  return { header, rows };
}

export interface MarkdownProps {
  children: string;
  className?: string;
  /** Overridable so the labels can move to `next-intl` without touching a content file. */
  labels?: Partial<LessonBlockLabels>;
}

/**
 * Renders authored Markdown (lessons, prompts, explanations). Content is authored in-repo
 * and validated, so raw HTML is disabled and links open safely.
 */
export function Markdown({ children, className, labels }: MarkdownProps) {
  const label = { ...LESSON_BLOCK_LABELS, ...labels };

  /** Nested render for block bodies that may contain inline Markdown. */
  const inline = (body: string) => (
    <Markdown className="prose-dm prose-dm-flush" labels={labels}>
      {body}
    </Markdown>
  );

  return (
    <div className={className ?? "prose-dm"}>
      <ReactMarkdown
        remarkPlugins={PLUGINS}
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
          /** The fenced block is rendered entirely by `code`; `pre` only passes it through. */
          pre: ({ children }) => <>{children}</>,
          code: (props) => {
            const {
              className: cls,
              children: content,
              "data-fence": fence,
              "data-meta": meta,
            } = props as {
              className?: string;
              children?: ReactNode;
              "data-fence"?: string;
              "data-meta"?: string;
            };
            if (fence === undefined) return <code className="inline-code">{content}</code>;

            const body = String(content ?? "").replace(/\n$/, "");
            const caption = (meta ?? "").trim();

            switch (fence) {
              case "objetivos":
                return (
                  <Objectives
                    label={label.objectives}
                    items={body
                      .split("\n")
                      .map((line) => line.replace(/^[-*]\s*/, "").trim())
                      .filter(Boolean)
                      .map((line) => inline(line))}
                  />
                );
              case "clave":
                return <KeyIdea label={label.keyIdea}>{inline(body)}</KeyIdea>;
              case "sql-mal":
                return (
                  <CodeFigure
                    code={body}
                    variant="wrong"
                    label={label.wrong}
                    caption={caption || undefined}
                  />
                );
              case "sql-bien":
                return (
                  <CodeFigure
                    code={body}
                    variant="right"
                    label={label.right}
                    caption={caption || undefined}
                  />
                );
              case "resultado": {
                const { header, rows } = parsePipeTable(body);
                return (
                  <ResultTable
                    label={label.result}
                    caption={caption || undefined}
                    header={header}
                    rows={rows}
                  />
                );
              }
              case "diagrama": {
                const { name, argument } = parseDiagramRef(caption);
                const render = LESSON_DIAGRAMS[name];
                // An unknown diagram name degrades to its text alternative rather than crashing a
                // published lesson; `content:validate` is what stops it reaching production.
                if (!render) return <p>{body}</p>;
                return (
                  <DiagramFigure label={label.diagram} caption={inline(body)}>
                    {render(argument)}
                  </DiagramFigure>
                );
              }
              case "sql":
                return <CodeFigure code={body} caption={caption || undefined} />;
              default:
                return (
                  <pre>
                    <code className={cls}>{body}</code>
                  </pre>
                );
            }
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
