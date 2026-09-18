import { describe, expect, it } from "vitest";
import { loadContent } from "@/content/load";
import { lessonSchema } from "@/content/schemas/curriculum";
import {
  defaultHintMeta,
  defaultReward,
  defaultSolutionUnlock,
  exerciseSchema,
} from "@/content/schemas/exercise";
import { questionSchema } from "@/content/schemas/question";

describe("content registry", () => {
  it("validates with zero issues and the full 39-section path", () => {
    const loaded = loadContent();
    expect(loaded.issues).toEqual([]);
    expect(loaded.sections).toHaveLength(39);
    expect(loaded.sections.map((s) => s.number)).toEqual(
      Array.from({ length: 39 }, (_, i) => i + 1),
    );
    // Every published section has a derived quiz lesson.
    for (const s of loaded.sections.filter((x) => x.is_published)) {
      expect(loaded.lessons.some((l) => l.section === s.slug && l.kind === "quiz")).toBe(true);
    }
  });
});

describe("lessonSchema", () => {
  it("rejects theory lessons over the word limit", () => {
    const body = Array.from({ length: 950 }, () => "palabra").join(" ");
    const r = lessonSchema.safeParse({
      slug: "x-y",
      section: "select",
      kind: "theory",
      title: "Demasiado larga",
      sort_order: 0,
      estimated_minutes: 5,
      is_free: true,
      is_published: false,
      prerequisites: [],
      body_md: body,
    });
    expect(r.success).toBe(false);
  });
});

describe("questionSchema", () => {
  it("requires exactly one correct option for single and explanations for distractors", () => {
    const base = {
      slug: "q-x",
      section: "select",
      lesson: "select-columnas",
      type: "single",
      difficulty: "easy",
      topic: "tema",
      tags: ["select"],
      estimated_seconds: 30,
      prompt_md: "¿?",
      explanation_md: "porque sí",
      is_published: true,
    };
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { key: "a", body_md: "1", is_correct: true },
          { key: "b", body_md: "2", is_correct: true },
        ],
      }).success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { key: "a", body_md: "1", is_correct: true },
          { key: "b", body_md: "2", is_correct: false },
        ],
      }).success,
    ).toBe(false);
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { key: "a", body_md: "1", is_correct: true },
          { key: "b", body_md: "2", is_correct: false, why_incorrect_md: "no" },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("exerciseSchema", () => {
  const valid = {
    slug: "ventas-pais",
    section: "group-by",
    title: "Ventas por país",
    difficulty: "intermediate" as const,
    estimated_minutes: 8,
    concepts: ["group_by", "aggregate"],
    dataset: { slug: "tiendaviva", version: 1 },
    tables_used: ["orders"],
    scenario_md: "Finanzas necesita el cierre.",
    business_question_md: "¿Ventas por país?",
    learning_objective: "Agrupar y sumar importes por dimensión.",
    theory_ref: "group-by-leccion-1",
    expected_columns: [{ name: "country", type: "text" }],
    validation_rules: {},
    reference_solution: "SELECT country, SUM(total_amount) AS total FROM orders GROUP BY country;",
    hints: [
      { level: 1 as const, body_md: "Piensa en agrupar.", ...defaultHintMeta(1) },
      {
        level: 2 as const,
        body_md: "Agrupa por country y suma total_amount.",
        ...defaultHintMeta(2),
      },
      {
        level: 3 as const,
        body_md: "SELECT ___, SUM(___) FROM orders GROUP BY ___;",
        ...defaultHintMeta(3),
      },
    ],
    common_mistakes: [
      { category: "aggregation_level" as const, description_md: "a" },
      { category: "missing_filter" as const, description_md: "b" },
      { category: "wrong_columns" as const, description_md: "c" },
    ],
    expert_explanation_md: "Paso a paso.",
    reward: defaultReward("intermediate"),
    solution_unlock: defaultSolutionUnlock,
    is_published: false,
  };
  it("accepts a well-formed exercise", () => {
    expect(exerciseSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects a hint 3 that leaks the reference solution", () => {
    const leaky = {
      ...valid,
      hints: [
        valid.hints[0],
        valid.hints[1],
        { ...valid.hints[2], body_md: valid.reference_solution },
      ],
    };
    const r = exerciseSchema.safeParse(leaky);
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.message.includes("leaks"))).toBe(true);
  });
  it("requires a justification when rewards differ from defaults", () => {
    const r = exerciseSchema.safeParse({ ...valid, reward: { ...valid.reward, xp: 999 } });
    expect(r.success).toBe(false);
    expect(
      exerciseSchema.safeParse({
        ...valid,
        reward: { ...valid.reward, xp: 999 },
        notes: "capstone",
      }).success,
    ).toBe(true);
  });
});
