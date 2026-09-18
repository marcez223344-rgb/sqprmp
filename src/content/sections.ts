import type { SectionDef } from "./schemas/curriculum";

/**
 * The 39-section learning path (docs/CURRICULUM.md §1). `is_published: false` sections are
 * visible as outlines ("Próximamente") but cannot be started. `requires` is linear inside a
 * level; the first section of a level requires the last section of the previous level.
 */
type Outline = Omit<SectionDef, "course" | "requires"> & { requires?: string | null };

const outlines: Outline[] = [
  // N1 · Fundamentos ---------------------------------------------------------------
  {
    number: 1,
    slug: "introduccion-bases-de-datos",
    level: "beginner",
    title: "Introducción a bases de datos y SQL",
    summary:
      "Qué es una base de datos relacional, qué problemas resuelve en una empresa y qué papel juega SQL en el trabajo de un analista.",
    objectives: [
      "Explicar qué es una base de datos relacional y por qué las empresas la usan",
      "Distinguir entre datos operativos y analíticos con ejemplos reales",
      "Describir qué hace SQL y cómo se diferencia de una hoja de cálculo",
      "Identificar los roles que usan SQL a diario en una empresa de LATAM",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 2,
    slug: "tablas-filas-columnas-tipos",
    level: "beginner",
    title: "Tablas, filas, columnas y tipos de datos",
    summary:
      "Cómo se organiza la información en tablas, qué significan las claves primarias y foráneas y por qué importan los tipos de datos.",
    objectives: [
      "Leer el esquema de una tabla e interpretar sus columnas y tipos",
      "Explicar el rol de las claves primarias y foráneas en las relaciones",
      "Reconocer los tipos de datos más comunes: texto, números, fechas, booleanos",
      "Detectar problemas típicos de tipos (números guardados como texto, fechas ambiguas)",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 3,
    slug: "select",
    level: "beginner",
    title: "SELECT: tu primera consulta",
    summary:
      "Seleccionar columnas de una tabla, entender el resultado y adquirir hábitos de lectura y escritura de consultas.",
    objectives: [
      "Escribir consultas SELECT que devuelvan columnas específicas de una tabla",
      "Usar SELECT * con criterio y saber cuándo evitarlo",
      "Leer una tabla de resultados: columnas, filas, tipos y valores NULL",
      "Aplicar convenciones de formato que hacen legible una consulta",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 4,
    slug: "alias-y-expresiones",
    level: "beginner",
    title: "Alias y expresiones",
    summary:
      "Calcular valores nuevos a partir de columnas, renombrar resultados y presentar información clara para el negocio.",
    objectives: [
      "Crear columnas calculadas con operadores aritméticos y de texto",
      "Renombrar columnas y tablas con alias legibles",
      "Concatenar y formatear valores para reportes",
      "Explicar la precedencia de operadores y el uso de paréntesis",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 5,
    slug: "distinct",
    level: "beginner",
    title: "DISTINCT: valores únicos",
    summary:
      "Obtener listas de valores únicos y combinaciones únicas, y entender cómo DISTINCT interactúa con NULL y con el rendimiento.",
    objectives: [
      "Listar valores únicos de una o varias columnas",
      "Diferenciar DISTINCT de GROUP BY en casos simples",
      "Explicar cómo trata DISTINCT a los valores NULL",
      "Detectar cuándo DISTINCT oculta un problema de duplicados en los datos",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 6,
    slug: "where",
    level: "beginner",
    title: "WHERE: filtrar filas",
    summary:
      "Responder preguntas concretas del negocio filtrando filas por condiciones sobre texto, números y fechas.",
    objectives: [
      "Filtrar filas con condiciones de igualdad, rango y pertenencia",
      "Combinar filtros con AND, OR y NOT de forma correcta",
      "Filtrar por rangos de fechas sin perder registros en los bordes",
      "Usar LIKE e ILIKE para búsquedas por patrón",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 7,
    slug: "operadores-comparacion-logicos",
    level: "beginner",
    title: "Operadores de comparación y lógicos",
    summary:
      "Dominar la precedencia de AND/OR, los operadores IN, BETWEEN y NOT, y evitar los errores lógicos más comunes.",
    objectives: [
      "Aplicar la precedencia de AND, OR y NOT con paréntesis explícitos",
      "Usar IN y BETWEEN para expresar condiciones de forma clara",
      "Reescribir condiciones equivalentes y elegir la más legible",
      "Diagnosticar filtros que devuelven más o menos filas de lo esperado",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: null,
  },
  {
    number: 8,
    slug: "null",
    level: "beginner",
    title: "NULL: el valor desconocido",
    summary:
      "Entender qué significa NULL, por qué rompe comparaciones intuitivas y cómo tratarlo con IS NULL, COALESCE y NULLIF.",
    objectives: [
      "Explicar la lógica de tres valores y por qué NULL = NULL no es verdadero",
      "Filtrar y contar registros con y sin NULL",
      "Reemplazar NULL con valores de negocio usando COALESCE",
      "Reconocer el impacto de NULL en agregaciones y ordenamientos",
    ],
    is_free_theory: true,
    is_published: true,
    certificate: "fundamentos-sql",
  },
  // N2 · Transformar datos ---------------------------------------------------------
  {
    number: 9,
    slug: "funciones-de-texto",
    level: "beginner",
    title: "Funciones de texto",
    summary:
      "Limpiar, normalizar y extraer información de textos: mayúsculas, espacios, subcadenas, reemplazos y longitud.",
    objectives: [
      "Normalizar textos con UPPER, LOWER, TRIM e INITCAP",
      "Extraer partes de un texto con SUBSTRING, LEFT, RIGHT y SPLIT_PART",
      "Reemplazar y buscar patrones con REPLACE y POSITION",
      "Detectar problemas de calidad en textos (espacios, mayúsculas, acentos)",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 10,
    slug: "funciones-numericas",
    level: "beginner",
    title: "Funciones numéricas",
    summary:
      "Redondear, truncar, dividir sin errores y calcular porcentajes y variaciones con precisión.",
    objectives: [
      "Redondear y truncar valores con ROUND, TRUNC, CEIL y FLOOR",
      "Evitar la división entera y la división por cero",
      "Calcular porcentajes y variaciones porcentuales correctamente",
      "Elegir entre integer, numeric y double precision según el caso",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 11,
    slug: "fechas-y-horas",
    level: "beginner",
    title: "Fechas y horas",
    summary:
      "Trabajar con fechas, horas y zonas horarias: extraer partes, truncar por período, calcular diferencias y evitar errores de borde.",
    objectives: [
      "Extraer año, mes, día y día de la semana de una fecha",
      "Agrupar por período con DATE_TRUNC",
      "Calcular diferencias entre fechas y sumar intervalos",
      "Explicar el efecto de las zonas horarias en timestamptz",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 12,
    slug: "case",
    level: "beginner",
    title: "CASE: lógica condicional",
    summary:
      "Clasificar registros, crear segmentos y traducir códigos a etiquetas de negocio con expresiones CASE.",
    objectives: [
      "Escribir expresiones CASE simples y buscadas",
      "Crear segmentos y categorías a partir de rangos numéricos",
      "Combinar CASE con ORDER BY y con agregaciones",
      "Evitar errores de tipos y ramas ELSE olvidadas",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 13,
    slug: "ordenar-y-limitar",
    level: "beginner",
    title: "Ordenar y limitar resultados",
    summary:
      "Presentar resultados en el orden que pide el negocio, obtener top-N y paginar con OFFSET y LIMIT.",
    objectives: [
      "Ordenar por una o varias columnas, ascendente y descendente",
      "Controlar la posición de NULL en el ordenamiento",
      "Obtener los N primeros registros y paginar resultados",
      "Reconocer cuándo el orden no está garantizado sin ORDER BY",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  // N3 · Agregar y combinar --------------------------------------------------------
  {
    number: 14,
    slug: "funciones-de-agregacion",
    level: "intermediate",
    title: "Funciones de agregación",
    summary:
      "Resumir datos con COUNT, SUM, AVG, MIN y MAX, entender el efecto de NULL y evitar promedios engañosos.",
    objectives: [
      "Calcular totales, promedios, mínimos y máximos de un conjunto de filas",
      "Diferenciar COUNT(*), COUNT(col) y COUNT(DISTINCT col)",
      "Explicar cómo ignoran NULL las funciones de agregación",
      "Detectar promedios engañosos y proponer métricas alternativas",
    ],
    is_free_theory: false,
    is_published: true,
    certificate: null,
  },
  {
    number: 15,
    slug: "group-by",
    level: "intermediate",
    title: "GROUP BY: resumir por categoría",
    summary:
      "Agrupar filas por una o varias dimensiones y calcular métricas por grupo, la base de casi todo reporte de negocio.",
    objectives: [
      "Agrupar por una o varias columnas y calcular agregados por grupo",
      "Explicar la regla: toda columna seleccionada se agrupa o se agrega",
      "Combinar WHERE y GROUP BY en el orden correcto de evaluación",
      "Identificar el nivel de agregación correcto para una pregunta de negocio",
    ],
    is_free_theory: false,
    is_published: true,
    certificate: null,
  },
  {
    number: 16,
    slug: "having",
    level: "intermediate",
    title: "HAVING: filtrar grupos",
    summary:
      "Filtrar grupos después de agregar, distinguir HAVING de WHERE y responder preguntas como «clientes con más de 3 pedidos».",
    objectives: [
      "Filtrar grupos según valores agregados con HAVING",
      "Explicar la diferencia entre WHERE y HAVING con ejemplos",
      "Combinar WHERE, GROUP BY, HAVING y ORDER BY en una sola consulta",
      "Evitar errores al usar alias de agregados en HAVING",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 17,
    slug: "inner-join",
    level: "intermediate",
    title: "INNER JOIN: combinar tablas",
    summary:
      "Unir tablas relacionadas por claves, entender qué filas se conservan y evitar duplicados por relaciones uno a muchos.",
    objectives: [
      "Unir dos tablas por clave primaria y foránea con INNER JOIN",
      "Predecir el número de filas del resultado según la cardinalidad",
      "Usar alias de tabla y calificar columnas ambiguas",
      "Detectar joins que multiplican filas por error",
    ],
    is_free_theory: false,
    is_published: true,
    certificate: null,
  },
  {
    number: 18,
    slug: "left-right-full-join",
    level: "intermediate",
    title: "LEFT, RIGHT y FULL JOIN",
    summary:
      "Conservar filas sin correspondencia para responder preguntas como «clientes sin pedidos» y auditar datos faltantes.",
    objectives: [
      "Elegir entre INNER, LEFT, RIGHT y FULL JOIN según la pregunta",
      "Encontrar registros sin correspondencia con LEFT JOIN e IS NULL",
      "Explicar por qué un filtro en WHERE puede convertir un LEFT JOIN en INNER",
      "Contar correctamente cuando hay filas sin correspondencia",
    ],
    is_free_theory: false,
    is_published: true,
    certificate: null,
  },
  {
    number: 19,
    slug: "self-join",
    level: "intermediate",
    title: "Self joins",
    summary:
      "Unir una tabla consigo misma para jerarquías, comparaciones entre filas y detección de duplicados.",
    objectives: [
      "Resolver jerarquías (empleado–gerente, categoría–subcategoría) con self join",
      "Comparar filas de la misma tabla entre sí",
      "Evitar pares duplicados y auto-emparejamientos",
      "Reconocer cuándo una función de ventana es una mejor alternativa",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 20,
    slug: "joins-multiples-tablas",
    level: "intermediate",
    title: "Joins de múltiples tablas",
    summary:
      "Encadenar tres o más tablas, planificar el camino de joins y mantener el nivel de detalle correcto.",
    objectives: [
      "Planificar el orden de joins a partir del modelo de datos",
      "Unir tres o más tablas manteniendo el nivel de detalle correcto",
      "Combinar joins con agregaciones sin duplicar importes",
      "Escribir consultas legibles con alias consistentes y formato claro",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: "sql-analisis-negocio",
  },
  // N4 · Consultas avanzadas -------------------------------------------------------
  {
    number: 21,
    slug: "subconsultas",
    level: "advanced",
    title: "Subconsultas",
    summary:
      "Usar consultas dentro de consultas: escalares, en IN/EXISTS y en FROM, y saber cuándo conviene una alternativa.",
    objectives: [
      "Escribir subconsultas escalares, de lista y derivadas",
      "Filtrar con IN, NOT IN, EXISTS y NOT EXISTS entendiendo el efecto de NULL",
      "Reconocer subconsultas correlacionadas y su costo",
      "Elegir entre subconsulta, join y CTE según legibilidad",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 22,
    slug: "cte",
    level: "advanced",
    title: "CTE: consultas paso a paso",
    summary:
      "Estructurar consultas complejas en pasos legibles con WITH, incluidas las CTE recursivas para jerarquías.",
    objectives: [
      "Descomponer una consulta compleja en CTE con nombres claros",
      "Reutilizar una CTE varias veces dentro de la consulta",
      "Escribir una CTE recursiva para recorrer jerarquías",
      "Comparar CTE y subconsultas derivadas en legibilidad y rendimiento",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 23,
    slug: "operaciones-de-conjuntos",
    level: "advanced",
    title: "Operaciones de conjuntos",
    summary:
      "Combinar resultados con UNION, UNION ALL, INTERSECT y EXCEPT para consolidar y comparar fuentes.",
    objectives: [
      "Apilar resultados de consultas compatibles con UNION y UNION ALL",
      "Comparar conjuntos con INTERSECT y EXCEPT",
      "Alinear tipos y columnas entre consultas combinadas",
      "Elegir UNION ALL cuando los duplicados son válidos por rendimiento",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 24,
    slug: "agregacion-condicional",
    level: "advanced",
    title: "Agregación condicional",
    summary:
      "Construir tablas dinámicas y métricas segmentadas en una sola pasada con CASE dentro de agregados y FILTER.",
    objectives: [
      "Calcular métricas por segmento con SUM(CASE ...) y COUNT(...) FILTER",
      "Construir tablas pivote sin herramientas externas",
      "Calcular tasas y proporciones condicionales sin división por cero",
      "Comparar la agregación condicional con múltiples consultas separadas",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 25,
    slug: "funciones-de-ventana",
    level: "advanced",
    title: "Funciones de ventana",
    summary:
      "Calcular métricas sobre grupos de filas sin colapsarlas: particiones, ordenamientos y marcos de ventana.",
    objectives: [
      "Explicar qué es una ventana y en qué se diferencia de GROUP BY",
      "Usar OVER con PARTITION BY y ORDER BY",
      "Calcular participación sobre el total y promedios por grupo fila a fila",
      "Entender los marcos de ventana (ROWS y RANGE) en casos básicos",
    ],
    is_free_theory: false,
    is_published: true,
    certificate: null,
  },
  {
    number: 26,
    slug: "funciones-de-ranking",
    level: "advanced",
    title: "Funciones de ranking",
    summary:
      "Rankear clientes, productos y períodos con ROW_NUMBER, RANK, DENSE_RANK y NTILE, y obtener top-N por grupo.",
    objectives: [
      "Diferenciar ROW_NUMBER, RANK y DENSE_RANK ante empates",
      "Obtener el top-N por grupo con una CTE y ROW_NUMBER",
      "Segmentar en cuartiles y deciles con NTILE",
      "Elegir el criterio de desempate correcto para el negocio",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 27,
    slug: "totales-acumulados-promedios-moviles",
    level: "advanced",
    title: "Totales acumulados y promedios móviles",
    summary:
      "Construir acumulados, promedios móviles y comparaciones contra períodos anteriores con marcos de ventana.",
    objectives: [
      "Calcular totales acumulados por período y por grupo",
      "Calcular promedios móviles de N períodos con marcos ROWS",
      "Evitar resultados incorrectos por períodos faltantes",
      "Explicar la diferencia entre ROWS y RANGE en acumulados",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 28,
    slug: "lag-y-lead",
    level: "advanced",
    title: "LAG y LEAD",
    summary:
      "Comparar cada fila con la anterior o la siguiente: variaciones mes a mes, tiempos entre eventos y cambios de estado.",
    objectives: [
      "Acceder al valor anterior o siguiente con LAG y LEAD",
      "Calcular variaciones absolutas y porcentuales entre períodos",
      "Medir el tiempo entre eventos consecutivos de un mismo cliente",
      "Detectar cambios de estado en secuencias de eventos",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: "sql-analitico-avanzado",
  },
  // N5 · Analítica aplicada --------------------------------------------------------
  {
    number: 29,
    slug: "cohortes-y-retencion",
    level: "expert",
    title: "Análisis de cohortes y retención",
    summary:
      "Agrupar usuarios por su mes de alta y medir cuántos siguen activos con el tiempo: la métrica central de cualquier producto digital.",
    objectives: [
      "Definir cohortes por fecha de alta y período de actividad",
      "Construir una tabla de retención por cohorte y período",
      "Calcular tasas de retención y churn correctamente",
      "Interpretar una matriz de cohortes para el negocio",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 30,
    slug: "funnels",
    level: "expert",
    title: "Análisis de funnels",
    summary:
      "Medir conversiones entre pasos (visita → registro → compra) respetando el orden temporal de los eventos.",
    objectives: [
      "Modelar un funnel a partir de una tabla de eventos",
      "Calcular conversiones paso a paso y acumuladas",
      "Respetar el orden temporal y las ventanas de tiempo entre pasos",
      "Comparar funnels por segmento (país, canal, dispositivo)",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 31,
    slug: "deduplicacion",
    level: "expert",
    title: "Deduplicación",
    summary:
      "Detectar y resolver registros duplicados con criterios de negocio claros, sin perder información valiosa.",
    objectives: [
      "Detectar duplicados exactos y aproximados",
      "Elegir el registro «ganador» con reglas explícitas",
      "Deduplicar con ROW_NUMBER y DISTINCT ON",
      "Documentar el impacto de la deduplicación en las métricas",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 32,
    slug: "calidad-de-datos",
    level: "expert",
    title: "Investigaciones de calidad de datos",
    summary:
      "Auditar integridad referencial, valores fuera de rango, fechas imposibles y cifras que no cuadran, como lo hace un analista senior.",
    objectives: [
      "Diseñar chequeos de integridad referencial y de dominio",
      "Reconciliar totales entre tablas (pedidos vs. ítems vs. pagos)",
      "Cuantificar el impacto de los problemas encontrados",
      "Comunicar hallazgos de calidad con evidencia reproducible",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 33,
    slug: "depuracion-de-consultas",
    level: "expert",
    title: "Depuración de consultas",
    summary:
      "Diagnosticar consultas que devuelven resultados incorrectos: joins que multiplican, filtros mal ubicados, NULL y tipos.",
    objectives: [
      "Aplicar un método sistemático para aislar el paso que falla",
      "Verificar cardinalidades antes y después de cada join",
      "Detectar filtros que anulan LEFT JOIN y comparaciones con NULL",
      "Validar resultados contra cifras conocidas del negocio",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 34,
    slug: "fundamentos-de-optimizacion",
    level: "expert",
    title: "Fundamentos de optimización",
    summary:
      "Escribir consultas eficientes: filtrar temprano, evitar funciones sobre columnas indexadas y reducir el trabajo del motor.",
    objectives: [
      "Explicar por qué una consulta es lenta a partir de su plan lógico",
      "Filtrar y agregar lo antes posible para reducir filas",
      "Evitar patrones costosos (funciones sobre columnas, OR complejos, DISTINCT innecesario)",
      "Medir tiempos y comparar alternativas con criterio",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 35,
    slug: "indices-y-planes-de-ejecucion",
    level: "expert",
    title: "Índices y planes de ejecución",
    summary:
      "Leer EXPLAIN, entender cuándo un índice ayuda y conversar con ingeniería de datos con fundamentos.",
    objectives: [
      "Leer un plan de ejecución básico e identificar los nodos más costosos",
      "Explicar cuándo un índice acelera una consulta y cuándo no",
      "Reconocer scans secuenciales, index scans y joins hash/nested loop",
      "Proponer mejoras de consulta o de índice con evidencia",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  // N6 · Profesional ---------------------------------------------------------------
  {
    number: 36,
    slug: "sql-analitico-avanzado",
    level: "expert",
    title: "SQL analítico avanzado",
    summary:
      "Integrar ventanas, CTE, arrays y JSON para responder preguntas complejas de producto y finanzas en una sola consulta.",
    objectives: [
      "Combinar CTE, ventanas y agregación condicional en análisis completos",
      "Trabajar con arrays y JSON en datos de eventos",
      "Construir métricas de negocio con definiciones precisas",
      "Estructurar consultas largas de forma mantenible",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 37,
    slug: "casos-de-negocio",
    level: "expert",
    title: "Casos de negocio",
    summary:
      "Resolver pedidos ambiguos de marketing, finanzas y operaciones tal como llegan en la vida real, definiendo supuestos.",
    objectives: [
      "Traducir un pedido ambiguo a preguntas de datos precisas",
      "Explicitar supuestos y definiciones de métricas",
      "Entregar resultados con contexto y limitaciones",
      "Iterar con el solicitante a partir de resultados preliminares",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 38,
    slug: "desafios-de-entrevista",
    level: "expert",
    title: "Desafíos de entrevista técnica",
    summary:
      "Practicar los problemas clásicos de entrevistas de datos con tiempo limitado y explicación de la solución.",
    objectives: [
      "Resolver problemas típicos de entrevista (top-N, gaps, retención, duplicados) bajo tiempo",
      "Explicar en voz alta el razonamiento y las alternativas",
      "Anticipar preguntas sobre rendimiento y casos borde",
      "Reconocer patrones recurrentes de problemas",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: null,
  },
  {
    number: 39,
    slug: "proyectos-finales",
    level: "expert",
    title: "Proyectos finales (capstone)",
    summary:
      "Un análisis completo de punta a punta sobre un dataset realista, con entregables que puedes mostrar en tu portafolio.",
    objectives: [
      "Planificar un análisis completo a partir de objetivos de negocio",
      "Construir un conjunto de consultas reproducibles y documentadas",
      "Validar la calidad de los datos antes de concluir",
      "Comunicar conclusiones y recomendaciones con evidencia",
    ],
    is_free_theory: false,
    is_published: false,
    certificate: "analista-sql-profesional",
  },
];

export const sections: SectionDef[] = outlines.map((o, i) => ({
  ...o,
  course: "ruta-sql-analistas",
  requires:
    o.requires !== undefined ? o.requires : i === 0 ? null : (outlines[i - 1]?.slug ?? null),
}));
