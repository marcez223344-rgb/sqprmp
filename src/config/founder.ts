export const founder = {
  name: "Marcelo Pisner",
  role: "Fundador e instructor",
  bio: "Especialista en datos y SQL con experiencia en analítica de negocio en América Latina. Creó Data Minds SQL Academy para que más personas accedan a una carrera en datos con práctica realista.",
  avatar: "/brand/founder.jpg", // placeholder asset; replace with a real photo when available
  /**
   * Only real destinations belong here. `undefined` means "no profile supplied yet" and callers
   * must not render a link for it (CLAUDE.md rule 9: no dead-end UI).
   *
   * Until 2026-09-24 `linkedin` was `https://www.linkedin.com/` — the platform home page — and it
   * was rendered on /nosotros behind a "Ver perfil en LinkedIn" button, so every visitor who
   * clicked it landed nowhere. `website` was the invented domain `https://dataminds.example`.
   * The consultancy's real site lives in `brand.website`; the founder's personal profile was
   * supplied by the owner on 2026-09-24. He expects most of the product's traffic to come from
   * his LinkedIn reputation, so this link is a load-bearing part of the funnel, not decoration.
   */
  links: {
    linkedin: "https://www.linkedin.com/in/marcelo-pisner-62a1287/" as string | undefined,
    website: undefined as string | undefined,
  },
} as const;
