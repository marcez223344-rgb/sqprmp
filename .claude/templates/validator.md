# Validation rule template (`src/lib/validation/rules/<rule>.ts`)

```ts
import { z } from "zod";
import type { ValidationRule, ResultSet, Finding } from "../types";

export const config = z.object({
  // rule-specific options with defaults
});

export const rule: ValidationRule<z.infer<typeof config>> = {
  name: "<rule>",
  config,
  // Pure: no IO. Receives normalized result sets and (optionally) the parsed AST.
  evaluate({ actual, expected, ast, options }): Finding[] {
    // return [] when it passes; otherwise findings with category + message key + details
    return [];
  },
};
```

Feedback categories (`Finding.category`): `syntax`, `wrong_columns`, `wrong_column_order`, `row_count`, `cell_values`, `wrong_order`, `duplicates`, `missing_filter`, `join_condition`, `aggregation_level`, `null_handling`, `date_boundary`, `required_concept_missing`, `prohibited_pattern`, `performance`, `readability`.

Tests (`tests/unit/validation/<rule>.test.ts`): pass case, each failure branch, empty result, truncated result, NULL cells, numeric tolerance edge, type coercion (`numeric` vs `text`).
