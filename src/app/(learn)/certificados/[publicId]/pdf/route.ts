import { NextResponse } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { getOwnCertificate } from "@/lib/certificates/service";
import { clientEnv } from "@/lib/env/client";

export const runtime = "nodejs";

const PUBLIC_ID = /^DMSA-\d{4}-[A-Z0-9]{8}$/;

export async function GET(_req: Request, ctx: RouteContext<"/certificados/[publicId]/pdf">) {
  const profile = await getCurrentProfile();
  if (!profile) return new NextResponse(null, { status: 401 });
  const { publicId } = await ctx.params;
  if (!PUBLIC_ID.test(publicId)) return new NextResponse(null, { status: 404 });
  // RLS limits this read to the learner's own certificates (or admins).
  const cert = await getOwnCertificate(publicId);
  if (!cert) return new NextResponse(null, { status: 404 });
  const [t, format] = await Promise.all([getTranslations("certificates.pdf"), getFormatter()]);
  const verifyUrl = `${clientEnv().NEXT_PUBLIC_APP_URL}/verificar/${cert.verificationCode}`;
  const pdf = await renderCertificatePdf(
    cert,
    {
      certifies: t("certifies"),
      completed: t("completed"),
      skills: t("skills"),
      issuedOn: t("issuedOn"),
      verifyAt: t("verifyAt"),
      id: t("id"),
      revoked: t("revoked"),
    },
    verifyUrl,
    format.dateTime(new Date(cert.issuedAt), { dateStyle: "long" }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${cert.publicId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
