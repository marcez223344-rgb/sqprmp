/**
 * The six levels of the course (docs/CURRICULUM.md §1), in path order. The UI groups sections by
 * this list; `sections.level` in the database is only an internal difficulty label.
 *
 * Levels are defined by section slug, not by number, so renumbering a section cannot silently move
 * it to another level. A section missing from this list fails `tests/unit/course-levels.test.ts`.
 */
export const courseLevels = [
  {
    key: "n1",
    sectionSlugs: [
      "introduccion-bases-de-datos",
      "tablas-filas-columnas-tipos",
      "select",
      "alias-y-expresiones",
      "distinct",
      "where",
      "operadores-comparacion-logicos",
      "null",
    ],
  },
  {
    key: "n2",
    sectionSlugs: [
      "funciones-de-texto",
      "funciones-numericas",
      "fechas-y-horas",
      "case",
      "ordenar-y-limitar",
    ],
  },
  {
    key: "n3",
    sectionSlugs: [
      "funciones-de-agregacion",
      "group-by",
      "having",
      "inner-join",
      "left-right-full-join",
      "self-join",
      "joins-multiples-tablas",
    ],
  },
  {
    key: "n4",
    sectionSlugs: [
      "subconsultas",
      "cte",
      "operaciones-de-conjuntos",
      "agregacion-condicional",
      "funciones-de-ventana",
      "funciones-de-ranking",
      "totales-acumulados-promedios-moviles",
      "lag-y-lead",
    ],
  },
  {
    key: "n5",
    sectionSlugs: [
      "cohortes-y-retencion",
      "funnels",
      "deduplicacion",
      "calidad-de-datos",
      "depuracion-de-consultas",
      "fundamentos-de-optimizacion",
      "indices-y-planes-de-ejecucion",
    ],
  },
  {
    key: "n6",
    sectionSlugs: [
      "sql-analitico-avanzado",
      "casos-de-negocio",
      "desafios-de-entrevista",
      "sql-con-ia",
      "proyectos-finales",
    ],
  },
] as const satisfies readonly { key: string; sectionSlugs: readonly string[] }[];

export type CourseLevelKey = (typeof courseLevels)[number]["key"];
