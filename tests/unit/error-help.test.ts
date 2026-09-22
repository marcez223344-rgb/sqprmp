import { describe, expect, it } from "vitest";
import { errorHelpFor } from "@/lib/sandbox/error-help";

describe("errorHelpFor", () => {
  it("recognises a string written with double quotes", () => {
    const help = errorHelpFor({
      sqlstate: "42703",
      message: 'column "marketplace_partner" does not exist',
      sql: `select * from orders where channel = "marketplace_partner"`,
    });
    expect(help).toEqual({ key: "doubleQuotedString", params: { value: "marketplace_partner" } });
  });

  it("falls back to the plain missing-column advice when the name is not quoted in the SQL", () => {
    const help = errorHelpFor({
      sqlstate: "42703",
      message: 'column "total" does not exist',
      sql: "select total from orders",
    });
    expect(help?.key).toBe("unknownColumn");
  });

  it("points at a trailing comma before FROM", () => {
    const help = errorHelpFor({
      sqlstate: "42601",
      message: 'syntax error at or near "from"',
      sql: "select id, name, from customers",
    });
    expect(help?.key).toBe("trailingComma");
  });

  it("explains an aggregate without GROUP BY", () => {
    expect(
      errorHelpFor({ sqlstate: "42803", message: "column must appear in GROUP BY", sql: "" })?.key,
    ).toBe("aggregateWithoutGroupBy");
  });

  it("returns nothing for an unmapped state", () => {
    expect(errorHelpFor({ sqlstate: "XX000", message: "internal", sql: "" })).toBeNull();
  });
});
