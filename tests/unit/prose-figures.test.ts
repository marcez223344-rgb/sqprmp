import { describe, expect, it } from "vitest";
import { exerciseFigureExceptions } from "@/content/exercise-figure-exceptions";
import {
  openerClaim,
  proseNumbers,
  resultRowCountClaims,
  rowCountClaims,
  stripCode,
  wordOrDigitToNumber,
} from "../../scripts/lib/prose-figures";

describe("wordOrDigitToNumber", () => {
  it("reads digits with Spanish thousands separators", () => {
    expect(wordOrDigitToNumber("13 284")).toBe(13284);
    expect(wordOrDigitToNumber("13\u00a0284")).toBe(13284);
    expect(wordOrDigitToNumber("109.382")).toBe(109382);
    expect(wordOrDigitToNumber("431,5")).toBe(431.5);
  });

  it("reads spelled-out cardinals, including compounds", () => {
    expect(wordOrDigitToNumber("seis")).toBe(6);
    expect(wordOrDigitToNumber("Una")).toBe(1);
    expect(wordOrDigitToNumber("dieciséis")).toBe(16);
    expect(wordOrDigitToNumber("treinta y siete")).toBe(37);
    expect(wordOrDigitToNumber("noventa y nueve")).toBe(99);
  });

  it("rejects anything that is not a cardinal", () => {
    expect(wordOrDigitToNumber("clientes")).toBeNull();
    expect(wordOrDigitToNumber("CAT-30")).toBeNull();
  });
});

describe("stripCode", () => {
  it("drops inline spans and fenced blocks, where numbers are SQL literals", () => {
    expect(proseNumbers("el tope es `LIMIT 10` y hay 4 filas")).toEqual([4]);
    expect(proseNumbers("```sql\nSELECT 99;\n```\nquedan 3")).toEqual([3]);
    expect(stripCode("a `b 1` c")).toBe("a   c");
  });
});

describe("openerClaim", () => {
  const claim = (s: string) => openerClaim(s)?.value ?? null;

  it("reads the first cardinal of the §10 rule A opener", () => {
    expect(claim("El resultado de la consulta da 123 filas, una por cliente.")).toBe(123);
    expect(claim("El resultado de la consulta da seis filas, una por país.")).toBe(6);
    expect(
      claim("El resultado de la consulta da una sola fila con este perfil: 18 000 pedidos."),
    ).toBe(1);
    expect(claim("El resultado de la consulta da los 180 vendedores con sus encabezados.")).toBe(
      180,
    );
    expect(claim("El resultado de la consulta da treinta y siete productos.")).toBe(37);
    expect(claim("El resultado de la consulta da 13 284 pedidos entregados.")).toBe(13284);
  });

  it("still reads the older bare-figure opener the rule replaced", () => {
    expect(claim("3000 filas, una por cliente. `LOWER` no modifica la tabla.")).toBe(3000);
    expect(claim("8646 filas: 4323 transferencias.")).toBe(8646);
  });

  it("ignores figures inside code spans", () => {
    expect(
      claim("El resultado de la consulta da los códigos `CAT-1` a `CAT-30` sin repetir."),
    ).toBeNull();
  });

  it("makes no claim when the leading figure cannot be a row count", () => {
    expect(claim("El resultado de la consulta da 45 % de cobertura.")).toBeNull();
    expect(claim("El resultado de la consulta da una fila por cliente activo.")).toBeNull();
    expect(claim("El resultado de la consulta encabeza con el pedido 7964.")).toBeNull();
    expect(claim("La consulta se arma en cuatro pasos.")).toBeNull();
  });

  it("stops at the end of the opening sentence", () => {
    expect(claim("El resultado de la consulta da seis filas. La tabla tiene 3000.")).toBe(6);
  });
});

describe("resultRowCountClaims", () => {
  const values = (s: string) =>
    resultRowCountClaims(s, "expert_explanation_md").map((c) => c.value);

  it("claims a row count only when the query is the subject", () => {
    expect(values("La consulta devuelve 24 filas.")).toEqual([24]);
    expect(values("El resultado de la consulta tiene cero filas.")).toEqual([0]);
    expect(values("La sentencia produce 1 745 filas.")).toEqual([1745]);
    expect(values("La consulta da 28 filas para 24 categorías.")).toEqual([28]);
  });

  it("leaves alone figures about anything other than the result", () => {
    expect(values("La tabla `plays` tiene 109 382 filas.")).toEqual([]);
    expect(values("Sin los paréntesis obtendrías 952 filas.")).toEqual([]);
    expect(values("La CTE entrega 320 filas antes del filtro.")).toEqual([]);
    expect(values("Sobran 340 filas duplicadas.")).toEqual([]);
    expect(values("Ninguna fila cumple la condición.")).toEqual([]);
  });

  it("does not read a statement of grain as a count", () => {
    expect(values("La consulta devuelve una fila por pedido.")).toEqual([]);
    expect(values("El resultado tiene 24 filas para cada categoría.")).toEqual([]);
  });
});

describe("rowCountClaims", () => {
  it("reports the opening figure once, not twice", () => {
    const claims = rowCountClaims([
      {
        field: "expert_explanation_md",
        text: "El resultado de la consulta da 24 filas, una por categoría.",
      },
    ]);
    expect(claims.map((c) => c.kind)).toEqual(["opener"]);
  });

  it("collects claims from the scenario too", () => {
    const claims = rowCountClaims([
      { field: "expert_explanation_md", text: "El resultado de la consulta da 6 filas." },
      { field: "scenario_md", text: "Hoy la consulta devuelve 18 filas y nadie la lee." },
    ]);
    expect(claims.map((c) => [c.field, c.value])).toEqual([
      ["expert_explanation_md", 6],
      ["scenario_md", 18],
    ]);
  });
});

describe("the opt-out registry", () => {
  it("only exempts fields the gate reads, and never the opener", () => {
    for (const e of exerciseFigureExceptions) {
      expect(["scenario_md", "expert_explanation_md"]).toContain(e.field);
      expect(e.reason.length).toBeGreaterThan(20);
      // An exception quotes an explicit "la consulta devuelve N filas" phrase: the only kind the
      // gate lets the registry silence. An opener phrase starts with the §10 rule A sentence.
      expect(e.phrase.startsWith("El resultado de la consulta da")).toBe(false);
      expect(resultRowCountClaims(e.phrase, "expert_explanation_md")).toHaveLength(1);
    }
  });

  it("an exception phrase is matched literally, so it cannot silence a different figure", () => {
    const exempt = "la consulta devuelve cero filas";
    const prose = `Con NOT IN la consulta devuelve cero filas. Aun así la consulta devuelve 73 filas.`;
    const claims = resultRowCountClaims(prose, "expert_explanation_md").filter(
      (c) => c.phrase !== exempt,
    );
    expect(claims.map((c) => c.value)).toEqual([73]);
  });
});
