import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es-419.json";
import type { QuizQuestion } from "@/lib/quizzes/service";
import { QuizRunner } from "./quiz-runner";

vi.mock("@/lib/quizzes/actions", () => ({
  answerQuestionAction: vi.fn(),
  answerReviewQuestionAction: vi.fn(),
  finishQuizAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

function question(id: string, over: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id,
    slug: `q-${id}`,
    type: "single",
    difficulty: "easy",
    topic: "WHERE",
    prompt_md: `Pregunta ${id}`,
    code_md: null,
    options: [
      { key: "a", body_md: "Opción A" },
      { key: "b", body_md: "Opción B" },
    ],
    pairs: null,
    estimated_seconds: 30,
    feedback: null,
    ...over,
  };
}

function mount(questions: QuizQuestion[]) {
  render(
    <NextIntlClientProvider locale="es-419" messages={messages} timeZone="UTC">
      <QuizRunner questions={questions} mode="quiz" lessonSlug="quiz-where" />
    </NextIntlClientProvider>,
  );
}

describe("QuizRunner select-all feedback (round 6, item 18)", () => {
  it("keeps correct picks green and labelled when the answer is incomplete", () => {
    mount([
      question("m", {
        type: "multiple",
        options: [
          { key: "a", body_md: "Uno" },
          { key: "b", body_md: "Dos" },
          { key: "c", body_md: "Tres" },
          { key: "d", body_md: "Cuatro" },
        ],
        feedback: {
          given: ["a", "c"],
          correct: false,
          correctAnswer: ["a", "c", "d"],
          explanation_md: "",
          whyIncorrect_md: null,
        },
      }),
    ]);
    const row = (text: string) => screen.getByText(text).closest("label")!;
    expect(within(row("Uno")).getByText("Correcta")).toBeVisible();
    expect(within(row("Tres")).getByText("Correcta")).toBeVisible();
    expect(within(row("Cuatro")).getByText("Te faltó marcar esta")).toBeVisible();
    expect(within(row("Dos")).queryByText(/Correcta|Te faltó|No había/)).toBeNull();
    expect(screen.getByText("Marcaste 2 de 3 correctas.")).toBeInTheDocument();
  });

  it("names a wrong pick and counts it in the verdict", () => {
    mount([
      question("m", {
        type: "multiple",
        feedback: {
          given: ["a", "b"],
          correct: false,
          correctAnswer: ["a"],
          explanation_md: "",
          whyIncorrect_md: null,
        },
      }),
    ]);
    const wrongRow = screen.getByText("Opción B").closest("label")!;
    expect(within(wrongRow).getByText("No había que marcarla")).toBeVisible();
    expect(
      screen.getByText("Marcaste 1 de 1 correcta. Además marcaste 1 opción que no era correcta."),
    ).toBeInTheDocument();
  });
});

describe("QuizRunner progress bar (round 6, item 12)", () => {
  it("marks the current question as the current step, not as answered", () => {
    const answered = {
      given: "a",
      correct: true,
      correctAnswer: "a",
      explanation_md: "",
      whyIncorrect_md: null,
    };
    mount([question("1", { feedback: answered }), question("2"), question("3")]);
    const bar = screen.getByRole("progressbar", { name: "Avance del quiz" });
    expect(bar).toHaveAttribute("aria-valuetext", "Pregunta 2 de 3");
    const segments = [...bar.children];
    expect(segments.map((s) => s.getAttribute("data-state"))).toEqual([
      "correct",
      "current",
      "pending",
    ]);
    expect(segments[1]).toHaveAttribute("aria-current", "step");
    expect(segments.filter((s) => s.hasAttribute("aria-current"))).toHaveLength(1);
  });
});

describe("QuizRunner matching choices (round 6, item 23)", () => {
  it("lists each right-hand value once", () => {
    mount([
      question("x", {
        type: "matching",
        options: [],
        pairs: {
          left: ["filtra filas", "antes de agrupar", "filtra grupos"],
          right: ["WHERE", "WHERE", "HAVING"],
        },
      }),
    ]);
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);
    for (const s of selects)
      expect(
        within(s)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Elegir…", "WHERE", "HAVING"]);
  });
});
