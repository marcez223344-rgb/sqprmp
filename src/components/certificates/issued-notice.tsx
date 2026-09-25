"use client";

import { useEffect, useRef } from "react";
import { Award } from "lucide-react";

/**
 * The moment a certificate is issued (owner feedback, round 6 item 24). The page renders this only
 * after the server confirmed a fresh issuance, so the texts arrive finished. Focus moves to the
 * heading once, so keyboard and screen-reader users land on the news instead of on the form that
 * just disappeared. The entrance animation is `motion-safe` and short; with reduced motion the
 * panel simply appears.
 */
export function CertificateIssuedNotice({
  title,
  body,
  next,
}: {
  title: string;
  body: string;
  next: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="certificado-emitido"
      className="border-achievement/40 bg-achievement/10 dark:bg-achievement/14 motion-safe:animate-celebrate-in flex gap-4 rounded-md border p-4"
    >
      <span
        aria-hidden="true"
        className="border-achievement/45 bg-surface text-achievement flex size-12 shrink-0 items-center justify-center rounded-full border"
      >
        <Award className="size-6" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 space-y-1">
        <h3
          id="certificado-emitido"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-lg font-semibold"
        >
          {title}
        </h3>
        <p className="text-sm">{body}</p>
        <p className="text-muted text-sm">{next}</p>
      </div>
    </section>
  );
}
