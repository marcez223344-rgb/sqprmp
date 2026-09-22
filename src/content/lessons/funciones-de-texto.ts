import type { LessonDef } from "../schemas/curriculum";

export const lessons: LessonDef[] = [
  {
    slug: "texto-normalizar-y-limpiar",
    section: "funciones-de-texto",
    kind: "theory",
    title: "Normalizar texto: mayúsculas, espacios y longitud",
    sort_order: 0,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["null-logica-de-tres-valores"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

El texto que cargan las personas nunca llega limpio: \`ana@ejemplo.lat\` y \`ANA@EJEMPLO.LAT\` son el mismo correo para el negocio, pero dos valores distintos para la base de datos. En \`customers\` de TiendaViva hay 39 correos guardados en mayúsculas; si los cuentas sin normalizar, tu informe muestra clientes que no existen.

Normalizar significa llevar un texto a una forma única antes de compararlo, contarlo o mostrarlo.

## Mayúsculas y minúsculas

\`\`\`sql
SELECT
  UPPER(city)   AS ciudad_mayusculas,
  LOWER(email)  AS email_normalizado,
  INITCAP(city) AS ciudad_titulo
FROM customers;
\`\`\`

- \`LOWER\` pasa todo a minúsculas; es la forma estándar de normalizar correos e identificadores.
- \`UPPER\` pasa todo a mayúsculas; útil para códigos de país o monedas.
- \`INITCAP\` pone en mayúscula la primera letra de cada palabra y el resto en minúscula: \`INITCAP('maría josé')\` devuelve \`María José\`.

Las tres funciones respetan los acentos: \`UPPER('café')\` devuelve \`CAFÉ\`.

## Comparar sin importar la capitalización

\`\`\`sql
SELECT id, email
FROM customers
WHERE email <> LOWER(email);
\`\`\`

Esa consulta te muestra exactamente los registros con problema de capitalización. Para comparar dos textos "como el negocio los entiende", normaliza **los dos lados**:

\`\`\`sql
WHERE LOWER(email) = LOWER('ANA@EJEMPLO.LAT')
\`\`\`

En la sección 6 viste \`ILIKE\`, que ignora mayúsculas en patrones. \`LOWER\` en ambos lados es el equivalente para igualdades exactas.

## Los acentos no se ignoran

Esta es la trampa que más reportes rompe: \`'José' = 'Jose'\` es **falso**, y \`LOWER\` no cambia eso. Mayúsculas y acentos son cosas distintas: normalizar la capitalización no normaliza la escritura. Si necesitas tratar \`Córdoba\` y \`Cordoba\` como la misma ciudad, hace falta quitar las tildes explícitamente (por ejemplo con \`TRANSLATE\`), y conviene decidirlo con el área de negocio: en español la tilde puede cambiar el significado.

## Espacios: TRIM

\`\`\`sql
SELECT TRIM('  Bazar Urbano  ');            -- 'Bazar Urbano'
SELECT RTRIM('Rincón Urbano 14', ' 0123456789'); -- 'Rincón Urbano'
\`\`\`

\`TRIM\` sin argumentos elimina espacios al principio y al final (nunca los del medio). Con un segundo argumento elimina **cualquiera de esos caracteres** en los extremos: \`LTRIM\` por la izquierda, \`RTRIM\` por la derecha, \`TRIM\` por ambos lados. Es la forma más corta de sacar sufijos numéricos o símbolos sobrantes.

Un espacio invisible al final es la causa clásica de un filtro que "no encuentra nada": \`'Lima ' = 'Lima'\` es falso.

## LENGTH cuenta caracteres, no bytes

\`\`\`sql
SELECT LENGTH('Rincón Urbano')       AS caracteres,  -- 13
       OCTET_LENGTH('Rincón Urbano') AS bytes;       -- 14
\`\`\`

\`LENGTH\` devuelve **caracteres**: la \`ó\` cuenta 1, aunque en UTF-8 ocupe 2 bytes. Si validas "máximo 20 caracteres", \`LENGTH\` es lo correcto; si dimensionas almacenamiento, mira \`OCTET_LENGTH\`.

Y recuerda la regla de NULL de la sección 8: \`LENGTH(NULL)\` es NULL, no 0. Toda función de texto aplicada a NULL devuelve NULL; usa \`COALESCE\` si necesitas un valor por defecto.

## Resumen

- \`LOWER\`/\`UPPER\`/\`INITCAP\` unifican la capitalización; los acentos siguen siendo distintos.
- \`TRIM\` limpia los extremos y acepta un conjunto de caracteres a eliminar.
- \`LENGTH\` cuenta caracteres y devuelve NULL si el texto es NULL.
`,
  },
  {
    slug: "texto-extraer-y-combinar",
    section: "funciones-de-texto",
    kind: "theory",
    title: "Extraer y combinar texto",
    sort_order: 1,
    estimated_minutes: 10,
    is_free: false,
    is_published: true,
    prerequisites: ["texto-normalizar-y-limpiar"],
    dataset: "tiendaviva",
    body_md: `## Por qué importa

Muchos datos útiles viven **dentro** de un texto: el dominio de un correo, el número de referencia de una transferencia, el prefijo de un código. Extraerlos con SQL evita exportar a una planilla y pegar fórmulas a mano.

## Cortar por posición: LEFT, RIGHT y SUBSTRING

\`\`\`sql
SELECT LEFT(store_name, 6)            AS primeros_6,
       RIGHT(store_name, 3)           AS ultimos_3,
       SUBSTRING(store_name FROM 8 FOR 5) AS desde_el_8
FROM sellers;
\`\`\`

\`LEFT(texto, n)\` toma los primeros \`n\` caracteres, \`RIGHT(texto, n)\` los últimos. \`SUBSTRING(texto FROM inicio FOR largo)\` corta desde una posición (la primera es **1**, no 0). Si omites \`FOR\`, corta hasta el final.

Sirven cuando la posición es fija (un código de 3 letras, un año al inicio). Cuando la posición depende del contenido, necesitas buscarla.

## Buscar una posición: POSITION

\`\`\`sql
SELECT POSITION('@' IN email) AS pos_arroba
FROM customers;
\`\`\`

Devuelve la posición del primer carácter buscado, o **0** si no aparece. Combinado con los cortes anteriores extrae partes variables:

\`\`\`sql
SELECT LEFT(email, POSITION('@' IN email) - 1) AS usuario
FROM customers;
\`\`\`

Ojo con el 0: si el texto no contiene \`@\`, \`POSITION\` devuelve 0 y el corte queda \`LEFT(email, -1)\`, que en PostgreSQL devuelve el texto **sin su último carácter**. No hay error: hay un valor silenciosamente incorrecto. Verifica siempre que el separador exista.

## Partir por un separador: SPLIT_PART

\`\`\`sql
SELECT SPLIT_PART(email, '@', 1) AS usuario,
       SPLIT_PART(email, '@', 2) AS dominio
FROM customers;
\`\`\`

\`SPLIT_PART(texto, separador, n)\` corta el texto por el separador y devuelve el trozo número \`n\` (empezando en 1). Es más legible que \`POSITION\` + \`SUBSTRING\` y no falla cuando el separador no está: devuelve una cadena vacía. Ambas formas son válidas; elige la que se lea mejor en tu equipo.

## Reemplazar: REPLACE

\`\`\`sql
SELECT REPLACE(kind, '_', ' ') AS tipo
FROM transactions;
\`\`\`

\`REPLACE\` cambia **todas** las apariciones del texto buscado. Se puede anidar para traducir varios valores:

\`\`\`sql
REPLACE(REPLACE(kind, 'transfer_out', 'Enviada'), 'transfer_in', 'Recibida')
\`\`\`

Cuando las reglas son muchas, \`CASE\` (sección 12) es más claro. \`REPLACE\` brilla para limpiezas simples: sacar puntos de un número, cambiar guiones por espacios.

## Concatenar: el operador ||

\`\`\`sql
SELECT UPPER(country) || ' · ' || city AS ubicacion
FROM customers;
\`\`\`

\`||\` une textos. Dos detalles que sorprenden:

1. Si **cualquier** operando es NULL, el resultado completo es NULL. Protege con \`COALESCE(city, 'sin ciudad')\`.
2. \`CONCAT(a, b, c)\` hace lo mismo pero trata los NULL como cadena vacía. Elige según lo que quieras que pase con los faltantes.

Puedes concatenar un número directamente (\`'Pedido ' || id\`): PostgreSQL lo convierte a texto.

## Resumen

- \`LEFT\`/\`RIGHT\`/\`SUBSTRING\` cortan por posición; \`POSITION\` la encuentra.
- \`SPLIT_PART\` parte por separador y es lo más legible para correos, códigos y referencias.
- \`||\` concatena pero propaga NULL; \`CONCAT\` no.
`,
  },
];
