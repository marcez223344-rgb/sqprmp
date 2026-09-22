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
        body_md:
          "Operativo: los datos salen de la misma tabla `orders` que usa la aplicación para vender.",
        is_correct: false,
        why_incorrect_md:
          "Lo que define el tipo de uso es la pregunta, no de qué tabla salen los datos: aquí se resumen miles de pedidos ya registrados para tomar una decisión.",
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
    type: "single",
    difficulty: "easy",
    topic: "Relaciones entre tablas",
    tags: ["claves", "tablas"],
    estimated_seconds: 40,
    prompt_md:
      "En TiendaViva cada pedido lo hizo un cliente. Según el modelo relacional, ¿cómo registra la tabla `orders` a qué cliente pertenece cada pedido?",
    options: [
      {
        key: "a",
        body_md: "Con una columna `customer_id` que guarda el identificador del cliente.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "Repitiendo el nombre completo del cliente en cada fila de `orders`.",
        is_correct: false,
        why_incorrect_md:
          "Repetir el nombre duplica información y no distingue a dos personas que se llaman igual; por eso se guarda el identificador, que sí es único.",
      },
      {
        key: "c",
        body_md:
          "Guardando la lista de pedidos dentro de la fila del cliente, separados por comas.",
        is_correct: false,
        why_incorrect_md:
          "En el modelo relacional cada pedido es una fila propia de `orders`; amontonar varios valores en una celda impide filtrarlos y sumarlos.",
      },
      {
        key: "d",
        body_md: "No lo registra: la relación se deduce comparando las fechas de compra.",
        is_correct: false,
        why_incorrect_md:
          "La relación entre dos tablas se declara de forma explícita con un identificador; nunca se adivina por coincidencia de fechas.",
      },
    ],
    explanation_md:
      "`orders.customer_id` apunta a `customers.id`. Guardar solo el identificador evita duplicar los datos del cliente en cada pedido y permite combinar ambas tablas cuando hace falta.",
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
        body_md:
          "Ninguno más: fuera del equipo técnico nadie escribe SQL, solo recibe reportes ya hechos",
        is_correct: false,
        why_incorrect_md:
          "En la práctica, muchas personas de marketing, finanzas y operaciones consultan los datos por su cuenta; SQL es una habilidad transversal, no exclusiva del equipo técnico.",
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
    difficulty: "easy",
    topic: "Definición de métricas",
    tags: ["metodo", "fechas"],
    estimated_seconds: 50,
    prompt_md:
      "Antes de escribir la consulta acuerdas esta definición con quien te pidió el dato: **un pedido cuenta en el mes en que se entrega**.\n\nEl pedido 8123 se creó el 31 de agosto de 2025 y se entregó el 3 de septiembre de 2025. Con esa definición, ¿en qué mes lo cuentas?",
    options: [
      {
        key: "a",
        body_md: "En septiembre, porque la fecha que manda según la definición es la de entrega.",
        is_correct: true,
      },
      {
        key: "b",
        body_md: "En agosto, porque el pedido se creó el 31 de agosto.",
        is_correct: false,
        why_incorrect_md:
          "La fecha de creación sería la referencia solo si la definición acordada dijera «pedidos creados en el mes». Aquí la definición habla de la entrega, así que el pedido cae en septiembre.",
      },
      {
        key: "c",
        body_md: "En los dos meses, porque el pedido atraviesa el cierre de mes.",
        is_correct: false,
        why_incorrect_md:
          "Contar el mismo pedido dos veces infla el total del año: con una definición clara, cada pedido pertenece a un único mes.",
      },
    ],
    explanation_md:
      "El mismo pedido cae en meses distintos según la fecha de referencia (creación o entrega). Ninguna de las dos es «la correcta» en abstracto: la correcta es la que acordaste y dejaste por escrito antes de escribir SQL.",
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
        body_md: "Los clientes revisan sus compras de madrugada y aprovechan para cancelarlas.",
        is_correct: false,
        why_incorrect_md:
          "Es una suposición de comportamiento sin evidencia: la actividad de personas se reparte a lo largo del día, y una concentración exacta en un mismo horario apunta a un proceso automático.",
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
