# Progressive hints template

| Level | Content | Must not contain |
|---|---|---|
| 1 · Conceptual | Name the SQL concept and why it applies to the business question. | Table or column names, expressions |
| 2 · Específica | Which tables/columns, which filter/join/grouping, order of operations. | Complete expressions or the full clause |
| 3 · Esqueleto | Query skeleton with `___` in the decisive parts (key expression, join condition, filter value, grouping column). | Anything that runs as-is and returns the expected result |

Reveal explanation (after unlock): **Consulta** → **Paso a paso** (one line per clause) → **Por qué funciona** → **Alternativas válidas** → **Error probable** (from the learner's last attempt category) → **Vuelve a intentarlo** (encouraging, no shaming).

Defaults (config `limits.ts`): hint XP penalty 10 % each (max 30 %), coin costs 0/1/2; solution reveal keeps 25 % XP and 0 coins; unlock after 3 genuine attempts OR 2 hints OR 10 minutes OR explicit request with warning.
