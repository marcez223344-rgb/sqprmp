import { SEAL_SHAPES, SEAL_VIEWBOX } from "@/lib/certificates/seal";
import { cn } from "@/lib/utils/cn";

/**
 * The certificate seal as inline SVG, drawn from the same shape list as the PDF and the share
 * image. Decorative by default (the certificate title and the «Certificado válido» verdict carry
 * the meaning in text); pass `label` only where the seal stands on its own.
 */
export function CertificateSeal({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SEAL_VIEWBOX.width} ${SEAL_VIEWBOX.height}`}
      className={cn("h-auto w-20 shrink-0 print:w-24", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      {SEAL_SHAPES.map((s, i) =>
        s.kind === "circle" ? (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={s.fill ?? "none"}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
          />
        ) : (
          <path
            key={i}
            d={s.d}
            fill={s.fill ?? "none"}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
            strokeLinecap={s.strokeLinecap}
            strokeLinejoin={s.strokeLinejoin}
          />
        ),
      )}
    </svg>
  );
}
