# Theory question template (`src/content/questions/<section>/<slug>.json`)

Validated by `src/content/schemas/question.ts`. Server-only fields: `is_correct`, `why_incorrect_md`, `explanation_md`, `answer`.

```json
{
  "slug": "where-vs-having-01",
  "section": "having",
  "lesson": "having/leccion-1",
  "type": "single",
  "difficulty": "easy",
  "topic": "Filtrar grupos",
  "tags": ["HAVING", "WHERE", "GROUP BY"],
  "estimated_seconds": 45,
  "prompt_md": "¿Cuál es la diferencia principal entre `WHERE` y `HAVING`?",
  "code_md": null,
  "options": [
    { "key": "a", "body_md": "`WHERE` filtra filas antes de agrupar; `HAVING` filtra grupos después de agregar.", "is_correct": true },
    { "key": "b", "body_md": "Son sinónimos; se puede usar cualquiera.", "is_correct": false, "why_incorrect_md": "No lo son: `HAVING` puede usar agregados y `WHERE` no." },
    { "key": "c", "body_md": "`HAVING` solo funciona con `COUNT`.", "is_correct": false, "why_incorrect_md": "Funciona con cualquier expresión, incluidos otros agregados." },
    { "key": "d", "body_md": "`WHERE` no puede combinarse con `GROUP BY`.", "is_correct": false, "why_incorrect_md": "Sí puede; de hecho es la forma habitual de filtrar antes de agrupar." }
  ],
  "explanation_md": "`WHERE` actúa sobre filas individuales antes de la agregación...",
  "is_published": false
}
```

Type-specific fields: `multiple` (several `is_correct: true`); `true_false` (two options); `fill_blank` (`answer: { accepted: ["GROUP BY"], case_sensitive: false }`); `query_interpretation` and `error_diagnosis` (`code_md` required); `matching` (`pairs: [{left, right}]`, options omitted); `scenario` (longer `prompt_md`, `single` or `multiple` semantics via `select_mode`).
