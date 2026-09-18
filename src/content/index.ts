/**
 * Content registry. Every authored module is imported here so the validator, the seed
 * builder and the app share one source of truth. Exercises are added in Phase 4.
 */
import { course } from "./course";
import { sections } from "./sections";
import { tiendaviva } from "./datasets/tiendaviva";
import { lessons as introLessons } from "./lessons/introduccion-bases-de-datos";
import { lessons as tablasLessons } from "./lessons/tablas-filas-columnas-tipos";
import { lessons as selectLessons } from "./lessons/select";
import { questions as introQuestions } from "./questions/introduccion-bases-de-datos";
import { questions as tablasQuestions } from "./questions/tablas-filas-columnas-tipos";
import { questions as selectQuestions } from "./questions/select";
import type { ExerciseDef } from "./schemas/exercise";

export const content = {
  courses: [course],
  sections,
  datasets: [tiendaviva],
  lessons: [...introLessons, ...tablasLessons, ...selectLessons],
  questions: [...introQuestions, ...tablasQuestions, ...selectQuestions],
  exercises: [] as ExerciseDef[],
};

export type ContentRegistry = typeof content;
