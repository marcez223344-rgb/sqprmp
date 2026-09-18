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
import { lessons as aliasLessons } from "./lessons/alias-y-expresiones";
import { lessons as distinctLessons } from "./lessons/distinct";
import { lessons as whereLessons } from "./lessons/where";
import { lessons as operadoresComparacionLogicosLessons } from "./lessons/operadores-comparacion-logicos";
import { lessons as nullLessons } from "./lessons/null";
import { questions as introQuestions } from "./questions/introduccion-bases-de-datos";
import { questions as tablasQuestions } from "./questions/tablas-filas-columnas-tipos";
import { questions as selectQuestions } from "./questions/select";
import { questions as aliasQuestions } from "./questions/alias-y-expresiones";
import { questions as distinctQuestions } from "./questions/distinct";
import { questions as whereQuestions } from "./questions/where";
import { questions as operadoresComparacionLogicosQuestions } from "./questions/operadores-comparacion-logicos";
import { questions as nullQuestions } from "./questions/null";
import { exercises as tablasExercises } from "./exercises/tablas-filas-columnas-tipos";
import { exercises as selectExercises } from "./exercises/select";
import { exercises as aliasExercises } from "./exercises/alias-y-expresiones";
import { exercises as distinctExercises } from "./exercises/distinct";
import { exercises as whereExercises } from "./exercises/where";
import { exercises as operadoresComparacionLogicosExercises } from "./exercises/operadores-comparacion-logicos";
import { exercises as nullExercises } from "./exercises/null";

export const content = {
  courses: [course],
  sections,
  datasets: [tiendaviva],
  lessons: [
    ...introLessons,
    ...tablasLessons,
    ...selectLessons,
    ...aliasLessons,
    ...distinctLessons,
    ...whereLessons,
    ...operadoresComparacionLogicosLessons,
    ...nullLessons,
  ],
  questions: [
    ...introQuestions,
    ...tablasQuestions,
    ...selectQuestions,
    ...aliasQuestions,
    ...distinctQuestions,
    ...whereQuestions,
    ...operadoresComparacionLogicosQuestions,
    ...nullQuestions,
  ],
  exercises: [
    ...tablasExercises,
    ...selectExercises,
    ...aliasExercises,
    ...distinctExercises,
    ...whereExercises,
    ...operadoresComparacionLogicosExercises,
    ...nullExercises,
  ],
};

export type ContentRegistry = typeof content;
