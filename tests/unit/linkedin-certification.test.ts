import { describe, expect, it } from "vitest";
import { linkedInAddCertificationUrl } from "@/lib/certificates/linkedin";

describe("linkedInAddCertificationUrl", () => {
  const url = new URL(
    linkedInAddCertificationUrl({
      name: "SQL para análisis: Fundamentos",
      organizationName: "Data Minds Solutions",
      issuedAt: new Date("2026-09-24T12:00:00Z"),
      certUrl: "https://example.com/verificar/abc123",
      certId: "DM-2026-0001",
    }),
  );

  it("targets LinkedIn's add-certification form", () => {
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(url.searchParams.get("startTask")).toBe("CERTIFICATION_NAME");
  });

  it("pre-fills name, issuer, date and the public verification link", () => {
    expect(url.searchParams.get("name")).toBe("SQL para análisis: Fundamentos");
    expect(url.searchParams.get("organizationName")).toBe("Data Minds Solutions");
    expect(url.searchParams.get("issueYear")).toBe("2026");
    expect(url.searchParams.get("issueMonth")).toBe("9");
    expect(url.searchParams.get("certUrl")).toBe("https://example.com/verificar/abc123");
    expect(url.searchParams.get("certId")).toBe("DM-2026-0001");
  });
});
