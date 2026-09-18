# Lesson template (`src/content/lessons/<section>/<slug>.mdx`)

```mdx
---
slug: group-by-leccion-1
section: group-by
title: "Agrupar para resumir: GROUP BY"
kind: theory
estimated_minutes: 7
objectives:
  - "Explicar qué hace GROUP BY con las filas de una tabla"
  - "Escribir una consulta que agrupe por una columna y calcule un agregado"
  - "Distinguir columnas agrupadas de columnas agregadas"
dataset: tiendaviva
is_free: true
is_published: false
---

## Por qué importa
Un párrafo con una situación de negocio concreta (finanzas, marketing, operaciones) en LATAM.

## El concepto
Explicación breve (≤ 150 palabras) con un diagrama o tabla de ejemplo si ayuda.

## Ejemplo ejecutable
```sql
SELECT country, COUNT(*) AS orders
FROM orders
GROUP BY country;
```
<Callout type="tip">Presiona **Ejecutar** para ver el resultado sobre el dataset TiendaViva.</Callout>

## Ejemplo resuelto paso a paso
1. Qué pide el negocio → 2. qué filas participan → 3. por qué agrupar → 4. qué agregar → 5. leer el resultado.

## Variantes
Agrupar por varias columnas; agregar varias métricas; combinar con `WHERE`.

## Errores comunes
- Seleccionar una columna que no está en `GROUP BY` ni en un agregado.
- Confundir `WHERE` (antes de agrupar) con `HAVING` (después).
- Contar con `COUNT(col)` esperando incluir `NULL`.

## En resumen
Tres líneas.
```

Rules: ≤ 900 words, es-419 "tú", SQL keywords uppercase, examples verified on the dataset snapshot, no claims of a single valid style.
