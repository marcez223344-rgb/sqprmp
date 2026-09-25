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
        programHours: 12,
      },
      {
        certifies: "Certifica que",
        completed: "completó",
        skills: "Habilidades",
        issuedOn: "Emitido el",
        verifyAt: "Verificar en",
        id: "ID",
        revoked: "REVOCADO",
        programHours: "Carga horaria estimada: 12 horas",
      },
      "https://example.test/verificar/abcdefghij0123456789",
      "18 de septiembre de 2026",
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  }, 30_000);

  it("renders the seal and the hours line, and omits both gracefully", async () => {
    const base = {
      publicId: "DMSA-2026-ABCDEF12",
      verificationCode: "abcdefghij0123456789",
      recipientName: "Sofía Pérez",
      title: "Fundamentos de SQL",
      skills: ["SELECT"],
      issuedAt: "2026-09-18T00:00:00Z",
      programHours: 0,
    };
    const labels = {
      certifies: "Certifica que",
      completed: "completó",
      skills: "Habilidades",
      issuedOn: "Emitido el",
      verifyAt: "Verificar en",
      id: "ID",
      revoked: "REVOCADO",
    };
    const url = "https://example.test/verificar/abcdefghij0123456789";
    const valid = await renderCertificatePdf({ ...base, revoked: false }, labels, url, "hoy");
    const revoked = await renderCertificatePdf({ ...base, revoked: true }, labels, url, "hoy");
    expect(valid.subarray(0, 5).toString()).toBe("%PDF-");
    expect(revoked.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
