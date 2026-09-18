import type { QuestionDef } from "../schemas/question";

const section = "introduccion-bases-de-datos";

export const questions: QuestionDef[] = [
  {
    slug: "intro-q01-relacional",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "single",
    difficulty: "very_easy",
    topic: "Bases de datos relacionales",
    tags: ["conceptos", "tablas"],
    estimated_seconds: 40,
    prompt_md: "¿Cómo organiza la información una base de datos relacional?",
    options: [
      {
        key: "a",
        body_md: "En tablas con filas y columnas, relacionadas por identificadores.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "En un único archivo de texto con todos los datos de la empresa.",
        is_correct: false,
        why_incorrect_md:
          "Un archivo único no permite relacionar entidades ni evitar duplicados; eso es justamente lo que resuelve el modelo relacional.",
      },
      {
        key: "c",
        body_md: "En hojas de cálculo separadas por departamento.",
        is_correct: false,
        why_incorrect_md:
          "Las hojas sueltas pierden consistencia y versiones; la base relacional centraliza y relaciona los datos.",
      },
      {
        key: "d",
        body_md: "En documentos sin estructura fija.",
        is_correct: false,
        why_incorrect_md:
          "Eso describe a algunas bases de datos documentales, no al modelo relacional basado en tablas.",
      },
    ],
    explanation_md:
      "El modelo relacional guarda cada tipo de entidad (clientes, pedidos) en una tabla y las conecta mediante identificadores, como `orders.customer_id` → `customers.id`.",
    is_published: true,
  },
  {
    slug: "intro-q02-operativo-analitico",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "single",
    difficulty: "easy",
    topic: "Datos operativos vs. analíticos",
    tags: ["conceptos"],
    estimated_seconds: 45,
    prompt_md:
      "El equipo de finanzas de TiendaViva quiere saber cuánto se vendió por país en agosto. ¿Qué tipo de uso de la base de datos es?",
    options: [
      {
        key: "a",
        body_md: "Analítico: resume muchos registros para responder una pregunta del negocio.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Operativo: registra una transacción nueva.",
        is_correct: false,
        why_incorrect_md:
          "Registrar un pedido es operativo; resumir ventas de un mes es analítico.",
      },
      {
        key: "c",
        body_md: "Ninguno: eso se hace en una hoja de cálculo.",
        is_correct: false,
        why_incorrect_md:
          "Es exactamente el tipo de pregunta que SQL responde mejor que una hoja de cálculo, sin importar el volumen.",
      },
    ],
    explanation_md:
      "Los usos analíticos agregan y comparan datos históricos; los operativos crean o modifican registros individuales durante la operación diaria.",
    is_published: true,
  },
  {
    slug: "intro-q03-sql-declarativo",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "true_false",
    difficulty: "easy",
    topic: "Naturaleza de SQL",
    tags: ["conceptos", "sql"],
    estimated_seconds: 30,
    prompt_md:
      "En SQL describes **qué** datos quieres, y el motor de la base de datos decide **cómo** obtenerlos.",
    options: [
      { key: "a", body_md: "Verdadero", is_correct: true },
      {
        key: "b",
        body_md: "Falso",
        is_correct: false,
        why_incorrect_md:
          "SQL es declarativo: no indicas el algoritmo de búsqueda, solo el resultado deseado.",
      },
    ],
    explanation_md:
      "Por eso la misma consulta funciona con mil o con millones de filas: el planificador del motor elige la estrategia de ejecución.",
    is_published: true,
  },
  {
    slug: "intro-q04-relacion-tablas",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "fill_blank",
    difficulty: "easy",
    topic: "Relaciones entre tablas",
    tags: ["claves", "tablas"],
    estimated_seconds: 40,
    prompt_md:
      "En TiendaViva, la tabla `orders` guarda el identificador del cliente en la columna `________` en lugar de repetir su nombre completo.",
    answer: { accepted: ["customer_id"], case_sensitive: false },
    explanation_md:
      "`orders.customer_id` apunta a `customers.id`. Guardar solo el identificador evita duplicar datos del cliente en cada pedido.",
    is_published: true,
  },
  {
    slug: "intro-q05-roles",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "multiple",
    difficulty: "very_easy",
    topic: "Quién usa SQL",
    tags: ["carrera"],
    estimated_seconds: 40,
    prompt_md:
      "¿Qué roles suelen usar SQL a diario en una empresa de datos? Selecciona todos los que apliquen.",
    options: [
      { key: "a", body_md: "Analista de datos", is_correct: true },
      { key: "b", body_md: "Analista de marketing o de producto", is_correct: true },
      { key: "c", body_md: "Ingeniero de datos", is_correct: true },
      {
        key: "d",
        body_md: "Ninguno: SQL solo lo usan administradores de bases de datos",
        is_correct: false,
        why_incorrect_md:
          "SQL es una herramienta transversal; los administradores son solo uno de muchos perfiles que lo usan.",
      },
    ],
    explanation_md:
      "SQL es la habilidad común a casi todos los roles de datos y, con frecuencia, la primera prueba técnica en un proceso de selección.",
    is_published: true,
  },
  {
    slug: "intro-q06-metodo-orden",
    section,
    lesson: "como-piensa-un-analista",
    type: "single",
    difficulty: "easy",
    topic: "Método de análisis",
    tags: ["metodo"],
    estimated_seconds: 45,
    prompt_md: "Te piden «las ventas de agosto». ¿Cuál es el mejor primer paso?",
    options: [
      {
        key: "a",
        body_md: "Definir qué significa «venta»: qué estados, qué fecha y qué moneda cuentan.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Escribir de inmediato `SELECT SUM(total_amount) FROM orders`.",
        is_correct: false,
        why_incorrect_md:
          "Sin definir estados, fechas y moneda, esa suma mezcla pedidos cancelados y monedas distintas.",
      },
      {
        key: "c",
        body_md: "Exportar toda la tabla de pedidos a una hoja de cálculo.",
        is_correct: false,
        why_incorrect_md:
          "Exportar todo no responde la pregunta y no escala; la definición sigue faltando.",
      },
      {
        key: "d",
        body_md: "Pedir acceso de administrador a la base de datos.",
        is_correct: false,
        why_incorrect_md: "Los permisos no resuelven la ambigüedad de la métrica.",
      },
    ],
    explanation_md:
      "Los errores más costosos son de definición. Aclarar estado, fecha de referencia y moneda antes de escribir SQL evita rehacer el análisis.",
    is_published: true,
  },
  {
    slug: "intro-q07-forma-resultado",
    section,
    lesson: "como-piensa-un-analista",
    type: "scenario",
    difficulty: "intermediate",
    topic: "Forma del resultado",
    tags: ["metodo", "agregacion"],
    estimated_seconds: 60,
    prompt_md:
      "Marketing pide: «Cantidad de pedidos y ventas totales por país durante la semana del Hot Sale (12 al 18 de mayo de 2025), sin cancelados». ¿Qué forma debe tener el resultado?",
    options: [
      {
        key: "a",
        body_md: "Una fila por país con tres columnas: país, pedidos, ventas.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Una fila por pedido con su país e importe.",
        is_correct: false,
        why_incorrect_md:
          "Eso es el detalle, no el resumen que pide marketing; faltaría agregar por país.",
      },
      {
        key: "c",
        body_md: "Una sola fila con el total general de la semana.",
        is_correct: false,
        why_incorrect_md: "El pedido dice «por país», así que se necesita una fila por cada país.",
      },
      {
        key: "d",
        body_md: "Una fila por día con el total diario.",
        is_correct: false,
        why_incorrect_md: "La dimensión pedida es país, no día.",
      },
    ],
    explanation_md:
      "Definir la «forma» del resultado (qué es una fila, qué columnas) antes de escribir SQL determina el nivel de agregación de la consulta.",
    is_published: true,
  },
  {
    slug: "intro-q08-fecha-referencia",
    section,
    lesson: "como-piensa-un-analista",
    type: "single",
    difficulty: "intermediate",
    topic: "Definición de métricas",
    tags: ["metodo", "fechas"],
    estimated_seconds: 50,
    prompt_md:
      "Un pedido se creó el 31 de agosto y se entregó el 3 de septiembre. Finanzas reconoce ingresos en la entrega. ¿En qué mes cuenta para «ventas de agosto» según esa definición?",
    options: [
      {
        key: "a",
        body_md: "En septiembre, porque la fecha de referencia es la entrega.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "En agosto, porque el pedido se creó en agosto.",
        is_correct: false,
        why_incorrect_md:
          "Con la definición de finanzas (reconocimiento en la entrega), la fecha de creación no es la que manda.",
      },
      {
        key: "c",
        body_md: "En ambos meses.",
        is_correct: false,
        why_incorrect_md:
          "Contarlo dos veces infla las cifras; cada pedido cuenta en un único período según la definición.",
      },
    ],
    explanation_md:
      "La misma transacción cae en meses distintos según la fecha de referencia elegida. Por eso la definición debe explicitarse y acordarse.",
    is_published: true,
  },
  {
    slug: "intro-q09-hoja-vs-sql",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "single",
    difficulty: "easy",
    topic: "SQL vs. hojas de cálculo",
    tags: ["conceptos"],
    estimated_seconds: 40,
    prompt_md:
      "¿Cuál es una ventaja concreta de una consulta SQL frente a una tabla dinámica en una hoja de cálculo?",
    options: [
      {
        key: "a",
        body_md:
          "Funciona igual con cien o con cien millones de filas y se puede versionar y compartir como texto.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "No necesita definir la métrica antes de calcularla.",
        is_correct: false,
        why_incorrect_md: "La definición de la métrica es necesaria en cualquier herramienta.",
      },
      {
        key: "c",
        body_md: "Siempre es más rápida de escribir que una tabla dinámica.",
        is_correct: false,
        why_incorrect_md: "No siempre; la ventaja está en escala, reproducibilidad y colaboración.",
      },
    ],
    explanation_md:
      "SQL escala al volumen de la base de datos, es reproducible y se puede guardar en control de versiones, algo difícil con tablas dinámicas manuales.",
    is_published: true,
  },
  {
    slug: "intro-q10-cancelado-madrugada",
    section,
    lesson: "que-es-una-base-de-datos",
    type: "scenario",
    difficulty: "intermediate",
    topic: "Interpretar datos operativos",
    tags: ["conceptos", "calidad"],
    estimated_seconds: 50,
    prompt_md:
      "Ves muchos pedidos con estado `cancelled` registrados a las 3:00 a. m. ¿Cuál es la interpretación más probable?",
    options: [
      {
        key: "a",
        body_md:
          "Un proceso automático cancela pedidos sin pago aprobado en un horario programado.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Los clientes latinoamericanos prefieren cancelar de madrugada.",
        is_correct: false,
        why_incorrect_md:
          "Es una suposición de comportamiento sin evidencia; los patrones horarios regulares suelen indicar procesos automáticos.",
      },
      {
        key: "c",
        body_md: "Los datos están corruptos y deben eliminarse.",
        is_correct: false,
        why_incorrect_md:
          "Un patrón regular no es corrupción; hay que entender el proceso que lo genera antes de descartar datos.",
      },
    ],
    explanation_md:
      "Entender cómo se generan los datos operativos (procesos automáticos, horarios, reglas) es clave para interpretarlos correctamente en el análisis.",
    is_published: true,
  },
];
