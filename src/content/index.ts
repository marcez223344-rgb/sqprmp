/**
 * Content registry. Every authored module is imported here so the validator, the seed
 * builder and the app share one source of truth. Exercises are added in Phase 4.
 */
import { course } from "./course";
import { sections } from "./sections";
import { tiendaviva } from "./datasets/tiendaviva";
import { bolsillo } from "./datasets/bolsillo";
import { pidelo } from "./datasets/pidelo";
import { lessons as introLessons } from "./lessons/introduccion-bases-de-datos";
import { lessons as tablasLessons } from "./lessons/tablas-filas-columnas-tipos";
import { lessons as selectLessons } from "./lessons/select";
import { lessons as aliasLessons } from "./lessons/alias-y-expresiones";
import { lessons as distinctLessons } from "./lessons/distinct";
import { lessons as whereLessons } from "./lessons/where";
import { lessons as operadoresComparacionLogicosLessons } from "./lessons/operadores-comparacion-logicos";
import { lessons as nullLessons } from "./lessons/null";
import { lessons as innerJoinLessons } from "./lessons/inner-join";
import { lessons as funcionesDeAgregacionLessons } from "./lessons/funciones-de-agregacion";
import { lessons as groupByLessons } from "./lessons/group-by";
import { lessons as leftRightFullJoinLessons } from "./lessons/left-right-full-join";
import { lessons as funcionesDeVentanaLessons } from "./lessons/funciones-de-ventana";
import { lessons as funcionesDeTextoLessons } from "./lessons/funciones-de-texto";
import { lessons as ordenarYLimitarLessons } from "./lessons/ordenar-y-limitar";
import { lessons as caseLessons } from "./lessons/case";
import { lessons as fechasYHorasLessons } from "./lessons/fechas-y-horas";
import { lessons as funcionesNumericasLessons } from "./lessons/funciones-numericas";
import { questions as introQuestions } from "./questions/introduccion-bases-de-datos";
import { questions as tablasQuestions } from "./questions/tablas-filas-columnas-tipos";
import { questions as selectQuestions } from "./questions/select";
import { questions as aliasQuestions } from "./questions/alias-y-expresiones";
import { questions as distinctQuestions } from "./questions/distinct";
import { questions as whereQuestions } from "./questions/where";
import { questions as operadoresComparacionLogicosQuestions } from "./questions/operadores-comparacion-logicos";
import { questions as nullQuestions } from "./questions/null";
import { questions as innerJoinQuestions } from "./questions/inner-join";
import { questions as funcionesDeAgregacionQuestions } from "./questions/funciones-de-agregacion";
import { questions as groupByQuestions } from "./questions/group-by";
import { questions as leftRightFullJoinQuestions } from "./questions/left-right-full-join";
import { questions as funcionesDeVentanaQuestions } from "./questions/funciones-de-ventana";
import { questions as funcionesDeTextoQuestions } from "./questions/funciones-de-texto";
import { questions as ordenarYLimitarQuestions } from "./questions/ordenar-y-limitar";
import { questions as caseQuestions } from "./questions/case";
import { questions as fechasYHorasQuestions } from "./questions/fechas-y-horas";
import { questions as funcionesNumericasQuestions } from "./questions/funciones-numericas";
import { exercises as tablasExercises } from "./exercises/tablas-filas-columnas-tipos";
import { exercises as selectExercises } from "./exercises/select";
import { exercises as aliasExercises } from "./exercises/alias-y-expresiones";
import { exercises as distinctExercises } from "./exercises/distinct";
import { exercises as whereExercises } from "./exercises/where";
import { exercises as operadoresComparacionLogicosExercises } from "./exercises/operadores-comparacion-logicos";
import { exercises as nullExercises } from "./exercises/null";
import { exercises as innerJoinExercises } from "./exercises/inner-join";
import { exercises as funcionesDeAgregacionExercises } from "./exercises/funciones-de-agregacion";
import { exercises as groupByExercises } from "./exercises/group-by";
import { exercises as leftRightFullJoinExercises } from "./exercises/left-right-full-join";
import { exercises as funcionesDeVentanaExercises } from "./exercises/funciones-de-ventana";
import { exercises as funcionesDeTextoExercises } from "./exercises/funciones-de-texto";
import { exercises as ordenarYLimitarExercises } from "./exercises/ordenar-y-limitar";
import { exercises as caseExercises } from "./exercises/case";
import { exercises as fechasYHorasExercises } from "./exercises/fechas-y-horas";
import { exercises as funcionesNumericasExercises } from "./exercises/funciones-numericas";

export const content = {
  courses: [course],
  sections,
  datasets: [tiendaviva, bolsillo, pidelo],
  lessons: [
    ...introLessons,
    ...tablasLessons,
    ...selectLessons,
    ...aliasLessons,
    ...distinctLessons,
    ...whereLessons,
    ...operadoresComparacionLogicosLessons,
    ...nullLessons,
    ...innerJoinLessons,
    ...funcionesDeAgregacionLessons,
    ...groupByLessons,
    ...leftRightFullJoinLessons,
    ...funcionesDeVentanaLessons,
    ...funcionesDeTextoLessons,
    ...ordenarYLimitarLessons,
    ...caseLessons,
    ...fechasYHorasLessons,
    ...funcionesNumericasLessons,
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
    ...innerJoinQuestions,
    ...funcionesDeAgregacionQuestions,
    ...groupByQuestions,
    ...leftRightFullJoinQuestions,
    ...funcionesDeVentanaQuestions,
    ...funcionesDeTextoQuestions,
    ...ordenarYLimitarQuestions,
    ...caseQuestions,
    ...fechasYHorasQuestions,
    ...funcionesNumericasQuestions,
  ],
  exercises: [
    ...tablasExercises,
    ...selectExercises,
    ...aliasExercises,
    ...distinctExercises,
    ...whereExercises,
    ...operadoresComparacionLogicosExercises,
    ...nullExercises,
    ...innerJoinExercises,
    ...funcionesDeAgregacionExercises,
    ...groupByExercises,
    ...leftRightFullJoinExercises,
    ...funcionesDeVentanaExercises,
    ...funcionesDeTextoExercises,
    ...ordenarYLimitarExercises,
    ...caseExercises,
    ...fechasYHorasExercises,
    ...funcionesNumericasExercises,
  ],
};

export type ContentRegistry = typeof content;
