# Exercise template (`src/content/exercises/<section>/<slug>.json`)

Validated by `src/content/schemas/exercise.ts`. All fields required unless marked optional.

````json
{
  "slug": "ventas-por-pais-2025",
  "section": "group-by",
  "title": "Ventas por país en 2025",
  "difficulty": "intermediate",
  "estimated_minutes": 8,
  "concepts": ["GROUP BY", "SUM", "WHERE", "fechas"],
  "prerequisites": ["select-basico", "where-fechas"],
  "dataset": { "slug": "tiendaviva", "version": 1 },
  "tables_used": ["orders", "customers"],
  "scenario_md": "El equipo de finanzas de TiendaViva prepara el cierre anual...",
  "business_question_md": "¿Cuál fue el total vendido (en moneda local) por país durante 2025, considerando solo pedidos entregados?",
  "learning_objective": "Agrupar por una dimensión y sumar importes aplicando un filtro de estado y rango de fechas.",
  "theory_ref": "group-by/leccion-1",
  "expected_columns": [
    { "name": "country", "type": "text" },
    { "name": "total_sales", "type": "numeric" }
  ],
  "validation_rules": {
    "order_matters": false,
    "numeric_tolerance": 0.01,
    "allow_extra_columns": false,
    "dedupe": false,
    "required_concepts": ["group_by", "aggregate_sum"],
    "prohibited_patterns": [],
    "max_execution_ms": 3000
  },
  "reference_solution": "SELECT c.country, SUM(o.total_amount) AS total_sales FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'delivered' AND o.created_at >= DATE '2025-01-01' AND o.created_at < DATE '2026-01-01' GROUP BY c.country;",
  "alternative_solutions": [
    {
      "label": "Con EXTRACT",
      "sql": "SELECT c.country, SUM(o.total_amount) AS total_sales FROM orders o JOIN customers c USING (id) ... "
    }
  ],
  "hints": [
    {
      "level": 1,
      "body_md": "Necesitas resumir importes por una categoría: piensa en agrupar.",
      "coin_cost": 0,
      "xp_penalty_percent": 10
    },
    {
      "level": 2,
      "body_md": "Une `orders` con `customers` para obtener `country`; filtra `status = 'delivered'` y el rango de fechas antes de agrupar.",
      "coin_cost": 1,
      "xp_penalty_percent": 10
    },
    {
      "level": 3,
      "body_md": "```sql\nSELECT c.country, SUM(___) AS total_sales\nFROM orders o JOIN customers c ON ___\nWHERE o.status = '___' AND o.created_at >= DATE '2025-01-01' AND o.created_at < DATE '___'\nGROUP BY ___;\n```",
      "coin_cost": 2,
      "xp_penalty_percent": 10
    }
  ],
  "common_mistakes": [
    {
      "category": "date_boundary",
      "description_md": "Usar `<= '2025-12-31'` deja fuera los pedidos del 31 de diciembre con hora."
    },
    {
      "category": "missing_filter",
      "description_md": "Olvidar el filtro de estado incluye pedidos cancelados."
    },
    {
      "category": "aggregation_level",
      "description_md": "Agrupar por ciudad en lugar de país cambia el nivel del resultado."
    }
  ],
  "expert_explanation_md": "Paso a paso... Por qué funciona... Alternativas... Nota de rendimiento/legibilidad...",
  "improvement_feedback": [
    { "condition": "uses_select_star", "message_key": "feedback.improve.select_star" },
    { "condition": "missing_alias_on_aggregate", "message_key": "feedback.improve.alias_aggregate" }
  ],
  "reward": { "xp": 40, "coins": 8, "solution_reveal_xp_percent": 25 },
  "solution_unlock": {
    "min_attempts": 3,
    "min_hints": 2,
    "min_minutes": 10,
    "allow_explicit": true
  },
  "allowed_statements": ["select"],
  "is_published": false,
  "notes": "optional: authoring notes, deviations from defaults with reason"
}
````
