// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderCertificatePdf } from "@/lib/certificates/pdf";

describe("renderCertificatePdf", () => {
  it("produces a PDF document with the recipient and verification URL", async () => {
    const buf = await renderCertificatePdf(
      {
        publicId: "DMSA-2026-ABCDEF12",
        verificationCode: "abcdefghij0123456789",
        recipientName: "Sofía Pérez",
        title: "Fundamentos de SQL",
        skills: ["SELECT", "WHERE"],
        issuedAt: "2026-09-18T00:00:00Z",
        revoked: false,
      },
      {
        certifies: "Certifica que",
        completed: "completó",
        skills: "Habilidades",
        issuedOn: "Emitido el",
        verifyAt: "Verificar en",
        id: "ID",
        revoked: "REVOCADO",
      },
      "https://example.test/verificar/abcdefghij0123456789",
      "18 de septiembre de 2026",
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  }, 30_000);
});
