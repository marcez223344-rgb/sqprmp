/**
 * Generates the curated avatar set (D-14): abstract geometric compositions plus the character
 * and mascot avatars in scripts/avatar-characters.ts. Deterministic: same input → same SVG.
 * Output: public/avatars/<slug>.svg and supabase/seed/0001_avatars.sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { characterAvatars, extraCharacterAvatars } from "./avatar-characters";

const palettes = [
  { name: "indigo", bg: "#2B4FE0", fg: "#FFFFFF", accent: "#F2652E" },
  { name: "coral", bg: "#F2652E", fg: "#FFFFFF", accent: "#2B4FE0" },
  { name: "teal", bg: "#1C8A5A", fg: "#FFFFFF", accent: "#F0B35A" },
  { name: "slate", bg: "#1E2533", fg: "#E8ECF3", accent: "#7C93FF" },
] as const;

type Shape = { name: string; label: string; draw: (fg: string, accent: string) => string };

const shapes: Shape[] = [
  {
    name: "grid",
    label: "Cuadrícula de cuatro celdas",
    draw: (fg, ac) =>
      `<rect x="22" y="22" width="24" height="24" rx="4" fill="${fg}"/><rect x="54" y="22" width="24" height="24" rx="4" fill="${fg}" opacity=".55"/><rect x="22" y="54" width="24" height="24" rx="4" fill="${fg}" opacity=".55"/><rect x="54" y="54" width="24" height="24" rx="4" fill="${ac}"/>`,
  },
  {
    name: "orbit",
    label: "Círculo con órbita",
    draw: (fg, ac) =>
      `<circle cx="50" cy="50" r="18" fill="${fg}"/><circle cx="50" cy="50" r="30" fill="none" stroke="${fg}" stroke-width="3" opacity=".5"/><circle cx="76" cy="38" r="6" fill="${ac}"/>`,
  },
  {
    name: "bars",
    label: "Barras ascendentes",
    draw: (fg, ac) =>
      `<rect x="22" y="58" width="12" height="20" rx="3" fill="${fg}" opacity=".6"/><rect x="40" y="44" width="12" height="34" rx="3" fill="${fg}" opacity=".8"/><rect x="58" y="30" width="12" height="48" rx="3" fill="${fg}"/><circle cx="64" cy="22" r="5" fill="${ac}"/>`,
  },
  {
    name: "triangle",
    label: "Triángulo con punto",
    draw: (fg, ac) =>
      `<polygon points="50,22 78,74 22,74" fill="${fg}"/><circle cx="50" cy="56" r="7" fill="${ac}"/>`,
  },
  {
    name: "wave",
    label: "Onda con nodo",
    draw: (fg, ac) =>
      `<path d="M18 58 C 30 38, 42 38, 50 58 S 70 78, 82 58" fill="none" stroke="${fg}" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="58" r="7" fill="${ac}"/>`,
  },
  {
    name: "hex",
    label: "Hexágono con núcleo",
    draw: (fg, ac) =>
      `<polygon points="50,20 76,35 76,65 50,80 24,65 24,35" fill="${fg}"/><polygon points="50,38 60,44 60,56 50,62 40,56 40,44" fill="${ac}"/>`,
  },
];

const outDir = join(process.cwd(), "public", "avatars");
mkdirSync(outDir, { recursive: true });

const rows: string[] = [];
let order = 0;
for (const shape of shapes) {
  for (const palette of palettes) {
    const slug = `${shape.name}-${palette.name}`;
    const alt = `${shape.label}, fondo ${palette.name}`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${alt}">` +
      `<rect width="100" height="100" rx="50" fill="${palette.bg}"/>` +
      shape.draw(palette.fg, palette.accent) +
      `</svg>\n`;
    writeFileSync(join(outDir, `${slug}.svg`), svg);
    rows.push(
      `  ('${slug}', '/avatars/${slug}.svg', '${alt.replace(/'/g, "''")}', true, ${order++})`,
    );
  }
}

// Character avatars come after the abstract set so existing sort orders do not move.
for (const c of characterAvatars()) {
  writeFileSync(join(outDir, `${c.slug}.svg`), c.svg);
  rows.push(
    `  ('${c.slug}', '/avatars/${c.slug}.svg', '${c.label.replace(/'/g, "''")}', true, ${order++})`,
  );
}

/**
 * Second wave of abstract compositions (owner feedback, 2026-09-23). Kept in a separate array and
 * emitted last: appending to `shapes` would have renumbered every character avatar.
 */
const extraShapes: Shape[] = [
  {
    name: "arco",
    label: "Arcos concéntricos",
    draw: (fg, ac) =>
      `<path d="M22 72 A28 28 0 0 1 78 72" fill="none" stroke="${fg}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M34 72 A16 16 0 0 1 66 72" fill="none" stroke="${fg}" stroke-width="7" opacity=".6" stroke-linecap="round"/>` +
      `<circle cx="50" cy="72" r="5" fill="${ac}"/>`,
  },
  {
    name: "nodos",
    label: "Red de nodos conectados",
    draw: (fg, ac) =>
      `<path d="M30 34 L70 30 M30 34 L44 68 M70 30 L44 68 M70 30 L74 62" stroke="${fg}" stroke-width="3" opacity=".65"/>` +
      `<circle cx="30" cy="34" r="8" fill="${fg}"/><circle cx="70" cy="30" r="7" fill="${ac}"/>` +
      `<circle cx="44" cy="68" r="7" fill="${fg}"/><circle cx="74" cy="62" r="5" fill="${fg}" opacity=".7"/>`,
  },
  {
    name: "capas",
    label: "Capas apiladas",
    draw: (fg, ac) =>
      `<ellipse cx="50" cy="34" rx="26" ry="9" fill="${ac}"/>` +
      `<ellipse cx="50" cy="50" rx="26" ry="9" fill="${fg}" opacity=".8"/>` +
      `<ellipse cx="50" cy="66" rx="26" ry="9" fill="${fg}"/>`,
  },
  {
    name: "rombo",
    label: "Rombo partido",
    draw: (fg, ac) =>
      `<polygon points="50,20 80,50 50,80 20,50" fill="${fg}"/>` +
      `<polygon points="50,20 80,50 50,50" fill="${ac}"/>`,
  },
  {
    name: "chispa",
    label: "Destello de cuatro puntas",
    draw: (fg, ac) =>
      `<path d="M50 18 Q56 44 82 50 Q56 56 50 82 Q44 56 18 50 Q44 44 50 18Z" fill="${fg}"/>` +
      `<circle cx="50" cy="50" r="6" fill="${ac}"/>`,
  },
  {
    name: "anillo",
    label: "Anillo con segmento",
    draw: (fg, ac) =>
      `<circle cx="50" cy="50" r="26" fill="none" stroke="${fg}" stroke-width="10" opacity=".45"/>` +
      `<path d="M50 24 A26 26 0 0 1 76 50" fill="none" stroke="${ac}" stroke-width="10" stroke-linecap="round"/>`,
  },
  {
    name: "escalera",
    label: "Escalera de tres peldaños",
    draw: (fg, ac) =>
      `<rect x="20" y="62" width="20" height="16" rx="4" fill="${fg}" opacity=".6"/>` +
      `<rect x="40" y="48" width="20" height="30" rx="4" fill="${fg}" opacity=".8"/>` +
      `<rect x="60" y="30" width="20" height="48" rx="4" fill="${fg}"/>` +
      `<circle cx="70" cy="22" r="5" fill="${ac}"/>`,
  },
  {
    name: "pluma",
    label: "Hoja con nervadura",
    draw: (fg, ac) =>
      `<path d="M50 20 Q78 40 50 80 Q22 40 50 20Z" fill="${fg}"/>` +
      `<path d="M50 26 L50 74" stroke="${ac}" stroke-width="3"/>` +
      `<path d="M50 40 L62 46 M50 52 L62 58 M50 40 L38 46 M50 52 L38 58" stroke="${ac}" stroke-width="2.5"/>`,
  },
];

for (const shape of extraShapes) {
  for (const palette of palettes) {
    const slug = `${shape.name}-${palette.name}`;
    const alt = `${shape.label}, fondo ${palette.name}`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${alt}">` +
      `<rect width="100" height="100" rx="50" fill="${palette.bg}"/>` +
      shape.draw(palette.fg, palette.accent) +
      `</svg>
`;
    writeFileSync(join(outDir, `${slug}.svg`), svg);
    rows.push(
      `  ('${slug}', '/avatars/${slug}.svg', '${alt.replace(/'/g, "''")}', true, ${order++})`,
    );
  }
}

for (const c of extraCharacterAvatars()) {
  writeFileSync(join(outDir, `${c.slug}.svg`), c.svg);
  rows.push(
    `  ('${c.slug}', '/avatars/${c.slug}.svg', '${c.label.replace(/'/g, "''")}', true, ${order++})`,
  );
}

const seed =
  `-- Generated by scripts/generate-avatars.ts. Do not edit by hand.\n` +
  `insert into public.avatars (slug, image_path, alt_text, is_active, sort_order) values\n` +
  rows.join(",\n") +
  `\non conflict (slug) do update set image_path = excluded.image_path, alt_text = excluded.alt_text, sort_order = excluded.sort_order;\n`;
mkdirSync(join(process.cwd(), "supabase", "seed"), { recursive: true });
writeFileSync(join(process.cwd(), "supabase", "seed", "0001_avatars.sql"), seed);
console.log(`generated ${rows.length} avatars`);
