/**
 * Character avatars (D-14 extension): friendly flat illustrations that give the learner something
 * to identify with, next to the original abstract set. Same constraints as before — generated SVG
 * only (no third-party art, no licensing question), deterministic, gender-neutral where possible,
 * and readable at 40 px.
 *
 * Skin and hair tones are varied deliberately: the audience is all of Latin America.
 */

export type CharacterAvatar = { slug: string; label: string; svg: string };

const SKIN = [
  { name: "arena", hex: "#F2C79A" },
  { name: "canela", hex: "#D79A6A" },
  { name: "cacao", hex: "#A56A44" },
  { name: "ebano", hex: "#6B4226" },
] as const;

const HAIR = [
  { name: "negro", hex: "#1E1B18" },
  { name: "castano", hex: "#5A3A22" },
  { name: "rubio", hex: "#C9964A" },
  { name: "violeta", hex: "#7C3AED" },
] as const;

const BACKGROUNDS = ["#2B4FE0", "#F2652E", "#1C8A5A", "#1E2533", "#7C3AED", "#0EA5E9"] as const;

function face(skin: string, extras: string) {
  return (
    `<circle cx="50" cy="52" r="24" fill="${skin}"/>` +
    `<circle cx="42" cy="49" r="3" fill="#1E1B18"/><circle cx="58" cy="49" r="3" fill="#1E1B18"/>` +
    `<path d="M42 60 Q50 67 58 60" stroke="#1E1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    extras
  );
}

/** Hair, headwear and accessories drawn on top of the face. */
const STYLES = [
  {
    name: "rizos",
    label: "Persona con rizos",
    draw: (hair: string) =>
      `<circle cx="36" cy="36" r="9" fill="${hair}"/><circle cx="50" cy="30" r="10" fill="${hair}"/>` +
      `<circle cx="64" cy="36" r="9" fill="${hair}"/><circle cx="30" cy="48" r="7" fill="${hair}"/>` +
      `<circle cx="70" cy="48" r="7" fill="${hair}"/>`,
  },
  {
    name: "corto",
    label: "Persona de pelo corto",
    draw: (hair: string) =>
      `<path d="M26 48 Q28 26 50 26 Q72 26 74 48 Q62 38 50 38 Q38 38 26 48Z" fill="${hair}"/>`,
  },
  {
    name: "trenzas",
    label: "Persona con trenzas",
    draw: (hair: string) =>
      `<path d="M26 50 Q26 26 50 26 Q74 26 74 50 Q64 40 50 40 Q36 40 26 50Z" fill="${hair}"/>` +
      `<rect x="22" y="48" width="8" height="26" rx="4" fill="${hair}"/>` +
      `<rect x="70" y="48" width="8" height="26" rx="4" fill="${hair}"/>`,
  },
  {
    name: "lentes",
    label: "Persona con anteojos",
    draw: (hair: string) =>
      `<path d="M26 46 Q30 24 50 24 Q70 24 74 46 Q62 36 50 36 Q38 36 26 46Z" fill="${hair}"/>` +
      `<circle cx="42" cy="49" r="8" fill="none" stroke="#1E2533" stroke-width="2.5"/>` +
      `<circle cx="58" cy="49" r="8" fill="none" stroke="#1E2533" stroke-width="2.5"/>` +
      `<path d="M50 49h0" stroke="#1E2533" stroke-width="2.5"/>`,
  },
  {
    name: "auriculares",
    label: "Persona con auriculares",
    draw: (hair: string) =>
      `<path d="M28 46 Q30 26 50 26 Q70 26 72 46 Q60 38 50 38 Q40 38 28 46Z" fill="${hair}"/>` +
      `<path d="M26 52 V44 Q26 26 50 26 Q74 26 74 44 V52" fill="none" stroke="#1E2533" stroke-width="4"/>` +
      `<rect x="20" y="48" width="10" height="16" rx="5" fill="#F2652E"/>` +
      `<rect x="70" y="48" width="10" height="16" rx="5" fill="#F2652E"/>`,
  },
  {
    name: "gorra",
    label: "Persona con gorra",
    draw: (hair: string) =>
      `<path d="M26 44 Q28 22 50 22 Q72 22 74 44Z" fill="${hair}"/>` +
      `<rect x="20" y="42" width="60" height="7" rx="3.5" fill="${hair}"/>`,
  },
] as const;

/** Mascots: a little more playful, for learners who would rather not pick a face. */
const CREATURES = [
  {
    slug: "robot",
    label: "Robot amistoso",
    body: (bg: string) =>
      `<rect x="26" y="32" width="48" height="42" rx="12" fill="#E8ECF3"/>` +
      `<circle cx="40" cy="50" r="5" fill="${bg}"/><circle cx="60" cy="50" r="5" fill="${bg}"/>` +
      `<rect x="40" y="62" width="20" height="4" rx="2" fill="#1E2533"/>` +
      `<rect x="47" y="20" width="6" height="12" rx="3" fill="#E8ECF3"/><circle cx="50" cy="18" r="5" fill="#F2652E"/>`,
  },
  {
    slug: "gato",
    label: "Gato curioso",
    body: () =>
      `<polygon points="28,34 34,16 46,28" fill="#F0B35A"/><polygon points="72,34 66,16 54,28" fill="#F0B35A"/>` +
      `<circle cx="50" cy="52" r="24" fill="#F0B35A"/>` +
      `<circle cx="41" cy="48" r="3.5" fill="#1E1B18"/><circle cx="59" cy="48" r="3.5" fill="#1E1B18"/>` +
      `<path d="M46 59 Q50 63 54 59" stroke="#1E1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    slug: "zorro",
    label: "Zorro atento",
    body: () =>
      `<polygon points="28,36 32,16 46,30" fill="#F2652E"/><polygon points="72,36 68,16 54,30" fill="#F2652E"/>` +
      `<circle cx="50" cy="52" r="24" fill="#F2652E"/>` +
      `<path d="M50 40 Q34 54 50 76 Q66 54 50 40Z" fill="#FFF3E6"/>` +
      `<circle cx="41" cy="50" r="3.5" fill="#1E1B18"/><circle cx="59" cy="50" r="3.5" fill="#1E1B18"/>` +
      `<circle cx="50" cy="62" r="3.5" fill="#1E1B18"/>`,
  },
  {
    slug: "buho",
    label: "Búho estudioso",
    body: () =>
      `<circle cx="50" cy="52" r="25" fill="#7C93FF"/>` +
      `<circle cx="41" cy="48" r="9" fill="#FFFFFF"/><circle cx="59" cy="48" r="9" fill="#FFFFFF"/>` +
      `<circle cx="41" cy="48" r="4" fill="#1E1B18"/><circle cx="59" cy="48" r="4" fill="#1E1B18"/>` +
      `<polygon points="50,56 45,62 55,62" fill="#F0B35A"/>`,
  },
  {
    slug: "capibara",
    label: "Carpincho tranquilo",
    body: () =>
      `<circle cx="34" cy="34" r="7" fill="#8B5E3C"/><circle cx="66" cy="34" r="7" fill="#8B5E3C"/>` +
      `<ellipse cx="50" cy="54" rx="26" ry="23" fill="#A5713F"/>` +
      `<circle cx="42" cy="50" r="3" fill="#1E1B18"/><circle cx="58" cy="50" r="3" fill="#1E1B18"/>` +
      `<ellipse cx="50" cy="62" rx="9" ry="6" fill="#7A4F2A"/>`,
  },
  {
    slug: "ajolote",
    label: "Ajolote sonriente",
    body: () =>
      `<circle cx="50" cy="54" r="24" fill="#F7A8C4"/>` +
      `<path d="M26 44 L14 36 M26 54 L12 54 M74 44 L86 36 M74 54 L88 54" stroke="#F7A8C4" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="41" cy="52" r="3.5" fill="#1E1B18"/><circle cx="59" cy="52" r="3.5" fill="#1E1B18"/>` +
      `<path d="M43 62 Q50 68 57 62" stroke="#1E1B18" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    slug: "pulpo",
    label: "Pulpo de datos",
    body: () =>
      `<circle cx="50" cy="44" r="22" fill="#7C3AED"/>` +
      `<path d="M32 60 Q28 76 20 80 M42 66 Q40 80 34 84 M58 66 Q60 80 66 84 M68 60 Q72 76 80 80" stroke="#7C3AED" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<circle cx="42" cy="42" r="3.5" fill="#FFFFFF"/><circle cx="58" cy="42" r="3.5" fill="#FFFFFF"/>`,
  },
  {
    slug: "cohete",
    label: "Cohete en despegue",
    body: () =>
      `<path d="M50 18 Q66 36 66 58 H34 Q34 36 50 18Z" fill="#E8ECF3"/>` +
      `<circle cx="50" cy="42" r="7" fill="#2B4FE0"/>` +
      `<polygon points="34,54 24,72 34,66" fill="#F2652E"/><polygon points="66,54 76,72 66,66" fill="#F2652E"/>` +
      `<path d="M44 62 Q50 84 56 62Z" fill="#F0B35A"/>`,
  },
] as const;

export function characterAvatars(): CharacterAvatar[] {
  const out: CharacterAvatar[] = [];

  STYLES.forEach((style, i) => {
    // One skin/hair/background combination per style, rotated so the grid never repeats a pairing.
    for (let k = 0; k < 4; k += 1) {
      const skin = SKIN[(i + k) % SKIN.length];
      const hair = HAIR[(i + k * 2) % HAIR.length];
      const bg = BACKGROUNDS[(i * 2 + k) % BACKGROUNDS.length];
      const label = `${style.label}, piel ${skin.name}`;
      out.push({
        slug: `persona-${style.name}-${skin.name}`,
        label,
        svg:
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${label}">` +
          `<rect width="100" height="100" rx="50" fill="${bg}"/>` +
          face(skin.hex, style.draw(hair.hex)) +
          `</svg>\n`,
      });
    }
  });

  CREATURES.forEach((c, i) => {
    const bg = BACKGROUNDS[(i + 2) % BACKGROUNDS.length];
    out.push({
      slug: `mascota-${c.slug}`,
      label: c.label,
      svg:
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${c.label}">` +
        `<rect width="100" height="100" rx="50" fill="${bg}"/>` +
        c.body(bg) +
        `</svg>\n`,
    });
  });

  return out;
}
