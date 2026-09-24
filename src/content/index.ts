/**
 * Content registry. Every authored module is imported here so the validator, the seed
 * builder and the app share one source of truth. Exercises are added in Phase 4.
 */
import { course } from "./course";
import { sections } from "./sections";
import { tiendaviva } from "./datasets/tiendaviva";
import { bolsillo } from "./datasets/bolsillo";
import { pidelo } from "./datasets/pidelo";
import { ritmo } from "./datasets/ritmo";
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
import { lessons as havingLessons } from "./lessons/having";
import { lessons as selfJoinLessons } from "./lessons/self-join";
import { lessons as joinsMultiplesTablasLessons } from "./lessons/joins-multiples-tablas";
import { lessons as subconsultasLessons } from "./lessons/subconsultas";
import { lessons as cteLessons } from "./lessons/cte";
import { lessons as agregacionCondicionalLessons } from "./lessons/agregacion-condicional";
import { lessons as funcionesDeRankingLessons } from "./lessons/funciones-de-ranking";
import { lessons as totalesAcumuladosPromediosMovilesLessons } from "./lessons/totales-acumulados-promedios-moviles";
import { lessons as operacionesDeConjuntosLessons } from "./lessons/operaciones-de-conjuntos";
import { lessons as lagYLeadLessons } from "./lessons/lag-y-lead";
import { lessons as cohortesYRetencionLessons } from "./lessons/cohortes-y-retencion";
import { lessons as funnelsLessons } from "./lessons/funnels";
import { lessons as deduplicacionLessons } from "./lessons/deduplicacion";
import { lessons as calidadDeDatosLessons } from "./lessons/calidad-de-datos";
import { lessons as depuracionDeConsultasLessons } from "./lessons/depuracion-de-consultas";
import { lessons as casosDeNegocioLessons } from "./lessons/casos-de-negocio";
import { lessons as desafiosDeEntrevistaLessons } from "./lessons/desafios-de-entrevista";
import { lessons as sqlAnaliticoAvanzadoLessons } from "./lessons/sql-analitico-avanzado";
import { lessons as proyectosFinalesLessons } from "./lessons/proyectos-finales";
import { lessons as fundamentosDeOptimizacionLessons } from "./lessons/fundamentos-de-optimizacion";
import { lessons as indicesYPlanesDeEjecucionLessons } from "./lessons/indices-y-planes-de-ejecucion";
import { lessons as sqlConIaLessons } from "./lessons/sql-con-ia";
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
import { questions as havingQuestions } from "./questions/having";
import { questions as selfJoinQuestions } from "./questions/self-join";
import { questions as joinsMultiplesTablasQuestions } from "./questions/joins-multiples-tablas";
import { questions as subconsultasQuestions } from "./questions/subconsultas";
import { questions as cteQuestions } from "./questions/cte";
import { questions as agregacionCondicionalQuestions } from "./questions/agregacion-condicional";
import { questions as funcionesDeRankingQuestions } from "./questions/funciones-de-ranking";
import { questions as totalesAcumuladosPromediosMovilesQuestions } from "./questions/totales-acumulados-promedios-moviles";
import { questions as operacionesDeConjuntosQuestions } from "./questions/operaciones-de-conjuntos";
import { questions as lagYLeadQuestions } from "./questions/lag-y-lead";
import { questions as cohortesYRetencionQuestions } from "./questions/cohortes-y-retencion";
import { questions as funnelsQuestions } from "./questions/funnels";
import { questions as deduplicacionQuestions } from "./questions/deduplicacion";
import { questions as calidadDeDatosQuestions } from "./questions/calidad-de-datos";
import { questions as depuracionDeConsultasQuestions } from "./questions/depuracion-de-consultas";
import { questions as casosDeNegocioQuestions } from "./questions/casos-de-negocio";
import { questions as desafiosDeEntrevistaQuestions } from "./questions/desafios-de-entrevista";
import { questions as sqlAnaliticoAvanzadoQuestions } from "./questions/sql-analitico-avanzado";
import { questions as proyectosFinalesQuestions } from "./questions/proyectos-finales";
import { questions as fundamentosDeOptimizacionQuestions } from "./questions/fundamentos-de-optimizacion";
import { questions as indicesYPlanesDeEjecucionQuestions } from "./questions/indices-y-planes-de-ejecucion";
import { questions as sqlConIaQuestions } from "./questions/sql-con-ia";
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
import { exercises as havingExercises } from "./exercises/having";
import { exercises as selfJoinExercises } from "./exercises/self-join";
import { exercises as joinsMultiplesTablasExercises } from "./exercises/joins-multiples-tablas";
import { exercises as subconsultasExercises } from "./exercises/subconsultas";
import { exercises as cteExercises } from "./exercises/cte";
import { exercises as agregacionCondicionalExercises } from "./exercises/agregacion-condicional";
import { exercises as funcionesDeRankingExercises } from "./exercises/funciones-de-ranking";
import { exercises as totalesAcumuladosPromediosMovilesExercises } from "./exercises/totales-acumulados-promedios-moviles";
import { exercises as operacionesDeConjuntosExercises } from "./exercises/operaciones-de-conjuntos";
import { exercises as lagYLeadExercises } from "./exercises/lag-y-lead";
import { exercises as cohortesYRetencionExercises } from "./exercises/cohortes-y-retencion";
import { exercises as funnelsExercises } from "./exercises/funnels";
import { exercises as deduplicacionExercises } from "./exercises/deduplicacion";
import { exercises as calidadDeDatosExercises } from "./exercises/calidad-de-datos";
import { exercises as depuracionDeConsultasExercises } from "./exercises/depuracion-de-consultas";
import { exercises as casosDeNegocioExercises } from "./exercises/casos-de-negocio";
import { exercises as desafiosDeEntrevistaExercises } from "./exercises/desafios-de-entrevista";
import { exercises as sqlAnaliticoAvanzadoExercises } from "./exercises/sql-analitico-avanzado";
import { exercises as proyectosFinalesExercises } from "./exercises/proyectos-finales";
import { exercises as fundamentosDeOptimizacionExercises } from "./exercises/fundamentos-de-optimizacion";
import { exercises as indicesYPlanesDeEjecucionExercises } from "./exercises/indices-y-planes-de-ejecucion";
import { exercises as sqlConIaExercises } from "./exercises/sql-con-ia";

export const content = {
  courses: [course],
  sections,
  datasets: [tiendaviva, bolsillo, pidelo, ritmo],
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
    ...havingLessons,
    ...selfJoinLessons,
    ...joinsMultiplesTablasLessons,
    ...subconsultasLessons,
    ...cteLessons,
    ...agregacionCondicionalLessons,
    ...funcionesDeRankingLessons,
    ...totalesAcumuladosPromediosMovilesLessons,
    ...operacionesDeConjuntosLessons,
    ...lagYLeadLessons,
    ...cohortesYRetencionLessons,
    ...funnelsLessons,
    ...deduplicacionLessons,
    ...calidadDeDatosLessons,
    ...depuracionDeConsultasLessons,
    ...casosDeNegocioLessons,
    ...desafiosDeEntrevistaLessons,
    ...sqlAnaliticoAvanzadoLessons,
    ...proyectosFinalesLessons,
    ...fundamentosDeOptimizacionLessons,
    ...indicesYPlanesDeEjecucionLessons,
    ...sqlConIaLessons,
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
    ...havingQuestions,
    ...selfJoinQuestions,
    ...joinsMultiplesTablasQuestions,
    ...subconsultasQuestions,
    ...cteQuestions,
    ...agregacionCondicionalQuestions,
    ...funcionesDeRankingQuestions,
    ...totalesAcumuladosPromediosMovilesQuestions,
    ...operacionesDeConjuntosQuestions,
    ...lagYLeadQuestions,
    ...cohortesYRetencionQuestions,
    ...funnelsQuestions,
    ...deduplicacionQuestions,
    ...calidadDeDatosQuestions,
    ...depuracionDeConsultasQuestions,
    ...casosDeNegocioQuestions,
    ...desafiosDeEntrevistaQuestions,
    ...sqlAnaliticoAvanzadoQuestions,
    ...proyectosFinalesQuestions,
    ...fundamentosDeOptimizacionQuestions,
    ...indicesYPlanesDeEjecucionQuestions,
    ...sqlConIaQuestions,
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
    ...havingExercises,
    ...selfJoinExercises,
    ...joinsMultiplesTablasExercises,
    ...subconsultasExercises,
    ...cteExercises,
    ...agregacionCondicionalExercises,
    ...funcionesDeRankingExercises,
    ...totalesAcumuladosPromediosMovilesExercises,
    ...operacionesDeConjuntosExercises,
    ...lagYLeadExercises,
    ...cohortesYRetencionExercises,
    ...funnelsExercises,
    ...deduplicacionExercises,
    ...calidadDeDatosExercises,
    ...depuracionDeConsultasExercises,
    ...casosDeNegocioExercises,
    ...desafiosDeEntrevistaExercises,
    ...sqlAnaliticoAvanzadoExercises,
    ...proyectosFinalesExercises,
    ...fundamentosDeOptimizacionExercises,
    ...indicesYPlanesDeEjecucionExercises,
    ...sqlConIaExercises,
  ],
};

export type ContentRegistry = typeof content;
