/**
 * D-40 «SQL con IA». Nothing here calls an AI provider: the product only prepares text the learner
 * pastes into their own assistant.
 */
export const aiContext = {
  /**
   * Sections whose exercises show «Copiar contexto para tu IA». Deliberately a short allowlist:
   * anywhere else a learner could paste the task into a chatbot and skip the thinking the
   * exercise exists to train.
   */
  sections: ["sql-con-ia"] as readonly string[],
  /**
   * Major version the copied prompt asks the assistant to target. It must match the engine that
   * grades submissions (PGlite 0.5.8 reports PostgreSQL 18.3); update it with the PGlite pin.
   */
  postgresMajorVersion: 18,
} as const;

export function isAiContextSection(sectionSlug: string): boolean {
  return aiContext.sections.includes(sectionSlug);
}
