/**
 * Geometry of the certificate seal (D-42): a drawn rosette with ribbon tails and the brand mark
 * (the database cylinder and prompt) at its centre. No emoji: they render differently on every
 * platform and read as informal to an employer.
 *
 * The shapes are defined once here, as plain data, and every output draws from this list: the
 * web component (`CertificateSeal`), the PDF (`@react-pdf/renderer` primitives) and the share
 * image (`sealSvgMarkup`, embedded as a data URI because satori cannot read /public). That is what
 * keeps the seal identical in every format.
 *
 * Colours are the light-theme brand tokens of `src/app/globals.css` (DESIGN_SYSTEM §2), repeated
 * as hex because neither the PDF renderer nor satori can read CSS variables. The seal is part of
 * a printed document, so it keeps the print palette even when the site is in dark mode.
 */
export const SEAL_COLORS = {
  primary: "#2b4fe0", // --primary
  primaryDeep: "#2342c4", // --primary-hover
  accent: "#f2652e", // --accent
  paper: "#ffffff", // --surface
} as const;

export const SEAL_VIEWBOX = { width: 120, height: 150 } as const;

export type SealShape =
  | {
      kind: "path";
      d: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "butt" | "square";
      strokeLinejoin?: "round" | "miter" | "bevel";
    }
  | {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    };

const CX = 60;
const CY = 60;
const POINTS = 24;
const OUTER_R = 56;
const INNER_R = 50;

const fmt = (n: number) => Number(n.toFixed(2));

/** Scalloped outer edge: alternating radii give the rosette its serrated rim. */
function rosettePath(): string {
  const steps = POINTS * 2;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const r = i % 2 === 0 ? OUTER_R : INNER_R;
    const a = (Math.PI * 2 * i) / steps - Math.PI / 2;
    pts.push(`${fmt(CX + r * Math.cos(a))} ${fmt(CY + r * Math.sin(a))}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** Evenly spaced beads on the inner ring, the engraved look of an embossed seal. */
function beads(): SealShape[] {
  const count = 36;
  const r = 38;
  return Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 * i) / count;
    return {
      kind: "circle" as const,
      cx: fmt(CX + r * Math.cos(a)),
      cy: fmt(CY + r * Math.sin(a)),
      r: 1.2,
      fill: SEAL_COLORS.paper,
    };
  });
}

export const SEAL_SHAPES: readonly SealShape[] = [
  // Ribbon tails, drawn first so the rosette covers their tops.
  { kind: "path", d: "M38 92 L24 146 L36 138 L44 148 L56 100 Z", fill: SEAL_COLORS.accent },
  { kind: "path", d: "M82 92 L96 146 L84 138 L76 148 L64 100 Z", fill: SEAL_COLORS.accent },
  { kind: "path", d: rosettePath(), fill: SEAL_COLORS.primary },
  { kind: "circle", cx: CX, cy: CY, r: 44, fill: SEAL_COLORS.primaryDeep },
  ...beads(),
  { kind: "circle", cx: CX, cy: CY, r: 32, fill: SEAL_COLORS.paper },
  { kind: "circle", cx: CX, cy: CY, r: 29, stroke: SEAL_COLORS.primary, strokeWidth: 1.2 },
  // Brand mark (public/brand/mark.svg), scaled into the centre: a database cylinder and a prompt.
  { kind: "path", d: "M47 48 a13 5 0 1 0 26 0 a13 5 0 1 0 -26 0 Z", fill: SEAL_COLORS.primary },
  {
    kind: "path",
    d: "M47 48 v8 c0 2.8 5.8 5 13 5 s13 -2.2 13 -5 v-8",
    stroke: SEAL_COLORS.primary,
    strokeWidth: 3.4,
    strokeLinecap: "round",
  },
  {
    kind: "path",
    d: "M47 58 v8 c0 2.8 5.8 5 13 5 s13 -2.2 13 -5 v-8",
    stroke: SEAL_COLORS.primary,
    strokeWidth: 3.4,
    strokeLinecap: "round",
  },
  {
    kind: "path",
    d: "M54 67 l4.5 4 l-4.5 4",
    stroke: SEAL_COLORS.accent,
    strokeWidth: 3.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  {
    kind: "path",
    d: "M62 75 h7",
    stroke: SEAL_COLORS.accent,
    strokeWidth: 3.4,
    strokeLinecap: "round",
  },
];

function attrs(s: SealShape): string {
  const common = [
    `fill="${s.fill ?? "none"}"`,
    s.stroke ? `stroke="${s.stroke}"` : "",
    s.strokeWidth ? `stroke-width="${s.strokeWidth}"` : "",
  ];
  if (s.kind === "circle")
    return [`cx="${s.cx}"`, `cy="${s.cy}"`, `r="${s.r}"`, ...common].filter(Boolean).join(" ");
  return [
    `d="${s.d}"`,
    ...common,
    s.strokeLinecap ? `stroke-linecap="${s.strokeLinecap}"` : "",
    s.strokeLinejoin ? `stroke-linejoin="${s.strokeLinejoin}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Standalone SVG document of the seal, for outputs that take an image (the share card). */
export function sealSvgMarkup(): string {
  const body = SEAL_SHAPES.map((s) => `<${s.kind} ${attrs(s)}/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SEAL_VIEWBOX.width}" height="${SEAL_VIEWBOX.height}" viewBox="0 0 ${SEAL_VIEWBOX.width} ${SEAL_VIEWBOX.height}">${body}</svg>`;
}

export function sealDataUri(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(sealSvgMarkup())}`;
}
