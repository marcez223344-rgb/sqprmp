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

El texto que cargan las personas nunca llega limpio. Para el negocio, \`ana@ejemplo.lat\` y \`ANA@EJEMPLO.LAT\` son el mismo correo de la misma persona; para la base de datos son dos valores distintos, y al contarlos dan dos clientes.

En la tabla \`customers\` de TiendaViva hay 39 correos guardados en mayúsculas. Si cuentas los correos distintos sin normalizarlos, tu informe muestra clientes que en realidad no existen y cualquier tasa calculada sobre ese total queda mal.

**Normalizar** significa llevar un texto a una forma única y predecible antes de compararlo, contarlo o mostrarlo.

## Mayúsculas y minúsculas

\`\`\`sql
SELECT
  UPPER(city)   AS ciudad_mayusculas,
  LOWER(email)  AS email_normalizado,
  INITCAP(city) AS ciudad_titulo
FROM customers;
\`\`\`

- \`LOWER\` pasa todo el texto a minúsculas. Es la forma estándar de normalizar correos e identificadores, porque para esos datos las mayúsculas nunca cambian el significado.
- \`UPPER\` pasa todo a mayúsculas. Sirve para códigos de país o de moneda, que por convención se escriben así: \`MX\`, \`ARS\`.
- \`INITCAP\` pone en mayúscula la primera letra de cada palabra y el resto en minúscula, útil para mostrar nombres propios: \`INITCAP('maría josé')\` devuelve \`María José\`.

Las tres funciones respetan los acentos, así que \`UPPER('café')\` devuelve \`CAFÉ\` y no \`CAFE\`.

## Comparar sin importar la capitalización

\`\`\`sql
SELECT id, email
FROM customers
WHERE email <> LOWER(email);
\`\`\`

Esa consulta compara cada correo con su propia versión en minúsculas: si son distintos, es porque el correo tiene alguna mayúscula. Te muestra exactamente los registros con problema de capitalización.

Cuando quieras comparar dos textos como los entiende el negocio, normaliza **los dos lados** de la igualdad:

\`\`\`sql
WHERE LOWER(email) = LOWER('ANA@EJEMPLO.LAT')
\`\`\`

Si normalizas solo uno, la comparación sigue siendo sensible a las mayúsculas del otro y vas a perder filas. En la sección 6 viste \`ILIKE\`, que ignora las mayúsculas al buscar patrones; \`LOWER\` en ambos lados es el equivalente para comparaciones de igualdad exacta.

## Los acentos no se ignoran

Esta es la trampa que más reportes rompe: \`'José' = 'Jose'\` es **falso**, y \`LOWER\` no cambia eso, porque las mayúsculas y los acentos son dos cosas distintas. Normalizar la capitalización no normaliza la escritura.

La consecuencia práctica es que el mismo cliente, cargado una vez con tilde y otra sin ella, se cuenta como dos, y una ciudad se parte en dos filas del informe. Si necesitas tratar \`Córdoba\` y \`Cordoba\` como la misma ciudad, tienes que quitar las tildes de forma explícita, por ejemplo con la función \`TRANSLATE\`. Conviene decidirlo junto al área de negocio, porque en español la tilde a veces cambia el significado de la palabra.

## Espacios: TRIM

\`\`\`sql
SELECT TRIM('  Bazar Urbano  ');            -- 'Bazar Urbano'
SELECT RTRIM('Rincón Urbano 14', ' 0123456789'); -- 'Rincón Urbano'
\`\`\`

\`TRIM\` sin más argumentos elimina los espacios del principio y del final del texto, y nunca los del medio.

Con un segundo argumento elimina de los extremos **cualquiera de los caracteres** que le indiques, en cualquier orden, hasta encontrar uno que no esté en esa lista. Hay tres variantes: \`LTRIM\` limpia por la izquierda, \`RTRIM\` por la derecha y \`TRIM\` por ambos lados. Es la forma más corta de sacar sufijos numéricos o símbolos que sobran.

Un espacio invisible al final del texto es la causa clásica de un filtro que «no encuentra nada»: \`'Lima ' = 'Lima'\` es falso, y como el espacio no se ve en pantalla, puedes pasar media hora revisando una consulta que está bien escrita.

## LENGTH cuenta caracteres, no bytes

\`\`\`sql
SELECT LENGTH('Rincón Urbano')       AS caracteres,  -- 13
       OCTET_LENGTH('Rincón Urbano') AS bytes;       -- 14
\`\`\`

\`LENGTH\` devuelve la cantidad de **caracteres**: la \`ó\` cuenta como uno solo, aunque al guardarse en la codificación UTF-8 ocupe dos bytes, que es lo que cuenta \`OCTET_LENGTH\`. Si validas una regla del tipo «máximo 20 caracteres», \`LENGTH\` es lo correcto; si estás calculando cuánto espacio de almacenamiento ocupa una columna, mira \`OCTET_LENGTH\`.

Y recuerda la regla de NULL que viste en la sección 8: \`LENGTH(NULL)\` devuelve NULL, no 0. Toda función de texto aplicada a NULL devuelve NULL, porque si no sabes cuál es el texto tampoco puedes saber su longitud. Usa \`COALESCE\` si necesitas un valor por defecto.

## Resumen

- \`LOWER\`, \`UPPER\` e \`INITCAP\` unifican la capitalización, pero los acentos siguen marcando diferencia.
- \`TRIM\` limpia los extremos del texto y acepta un conjunto de caracteres a eliminar.
- \`LENGTH\` cuenta caracteres y devuelve NULL cuando el texto es NULL.
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

Muchos datos útiles no están en una columna propia: viven **dentro** de un texto más largo. El dominio de un correo electrónico (lo que va después del \`@\`) sirve para separar clientes corporativos de particulares; el prefijo de un código de producto indica la línea a la que pertenece; el número de referencia está en el medio de la descripción de una transferencia.

Extraer esas partes con SQL evita el circuito habitual de exportar a una planilla, pegar fórmulas a mano y perder la trazabilidad de cómo se calculó cada dato.

## Cortar por posición: LEFT, RIGHT y SUBSTRING

\`\`\`sql
SELECT LEFT(store_name, 6)            AS primeros_6,
       RIGHT(store_name, 3)           AS ultimos_3,
       SUBSTRING(store_name FROM 8 FOR 5) AS desde_el_8
FROM sellers;
\`\`\`

\`LEFT(texto, n)\` toma los primeros \`n\` caracteres y \`RIGHT(texto, n)\` los últimos \`n\`. \`SUBSTRING(texto FROM inicio FOR largo)\` corta un pedazo a partir de una posición, teniendo en cuenta que el primer carácter de un texto es la posición **1** y no la 0. Si omites la parte \`FOR\`, corta desde esa posición hasta el final.

Estas tres funciones sirven cuando la posición es siempre la misma: un código de país de tres letras al inicio, un año en los primeros cuatro caracteres. Cuando la posición depende del contenido de cada fila, primero hay que buscarla.

## Buscar una posición: POSITION

\`\`\`sql
SELECT POSITION('@' IN email) AS pos_arroba
FROM customers;
\`\`\`

\`POSITION\` devuelve en qué posición aparece por primera vez el texto buscado, o **0** si no aparece nunca. Combinada con los cortes anteriores, permite extraer partes cuya posición cambia en cada fila:

\`\`\`sql
SELECT LEFT(email, POSITION('@' IN email) - 1) AS usuario
FROM customers;
\`\`\`

Presta atención a ese 0. Si un correo no contiene \`@\`, \`POSITION\` devuelve 0 y el corte queda escrito como \`LEFT(email, -1)\`, que en PostgreSQL devuelve el texto **sin su último carácter**. La consulta no falla y el resultado parece razonable, pero esas filas traen un dato incorrecto. Verifica siempre que el separador exista antes de cortar por él.

## Partir por un separador: SPLIT_PART

\`\`\`sql
SELECT SPLIT_PART(email, '@', 1) AS usuario,
       SPLIT_PART(email, '@', 2) AS dominio
FROM customers;
\`\`\`

\`SPLIT_PART(texto, separador, n)\` parte el texto cada vez que encuentra el separador y devuelve el pedazo número \`n\`, empezando a contar en 1.

Es más legible que combinar \`POSITION\` con \`SUBSTRING\` y no tiene el problema anterior: cuando el separador no aparece, devuelve una cadena vacía en lugar de un valor engañoso. Las dos formas son válidas; elige la que se lea mejor para el equipo que va a mantener la consulta.

## Reemplazar: REPLACE

\`\`\`sql
SELECT REPLACE(kind, '_', ' ') AS tipo
FROM transactions;
\`\`\`

\`REPLACE\` cambia **todas** las apariciones del texto buscado, no solo la primera. Se puede anidar una llamada dentro de otra para traducir varios valores:

\`\`\`sql
REPLACE(REPLACE(kind, 'transfer_out', 'Enviada'), 'transfer_in', 'Recibida')
\`\`\`

Esa forma anidada se vuelve difícil de leer en cuanto hay más de dos o tres reglas; en ese caso conviene usar \`CASE\` (sección 12), que las pone una debajo de la otra. \`REPLACE\` se aprovecha mejor en limpiezas simples: sacar los puntos de un número, cambiar guiones bajos por espacios.

## Concatenar: el operador ||

\`\`\`sql
SELECT UPPER(country) || ' · ' || city AS ubicacion
FROM customers;
\`\`\`

El operador \`||\` une varios textos en uno solo. Dos comportamientos que conviene tener presentes:

1. Si **cualquiera** de los operandos es NULL, el resultado completo es NULL. Un cliente sin ciudad no aparece con el país solo: aparece con la celda vacía. Protégete con \`COALESCE(city, 'sin ciudad')\`.
2. La función \`CONCAT(a, b, c)\` hace lo mismo pero trata los NULL como cadena vacía, así que el resto del texto se conserva. Elige una u otra según lo que quieras que ocurra con los datos faltantes.

También puedes concatenar un número directamente, como en \`'Pedido ' || id\`: PostgreSQL lo convierte a texto por su cuenta.

## Resumen

- \`LEFT\`, \`RIGHT\` y \`SUBSTRING\` cortan por posición; \`POSITION\` encuentra esa posición cuando es variable.
- \`SPLIT_PART\` parte por un separador y es la opción más legible para correos, códigos y referencias.
- \`||\` concatena pero deja todo en NULL si algún operando lo es; \`CONCAT\` no.
`,
  },
];
