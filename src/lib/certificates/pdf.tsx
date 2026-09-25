import "server-only";
import {
  Circle,
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
import { SEAL_SHAPES, SEAL_VIEWBOX } from "./seal";
import type { CertificateDetail } from "./service";

// Built-in Helvetica keeps the PDF self-contained (no font fetch at render time).
const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", color: "#1a1f2b", backgroundColor: "#ffffff" },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#1f5f8b",
    padding: 36,
    justifyContent: "space-between",
  },
  org: { fontSize: 11, letterSpacing: 2, color: "#5b6472", textTransform: "uppercase" },
  product: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 4 },
  heading: { fontSize: 12, color: "#5b6472", marginTop: 28 },
  name: { fontSize: 30, fontFamily: "Helvetica-Bold", marginTop: 6 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1f5f8b", marginTop: 6 },
  hours: { fontSize: 11, color: "#1a1f2b", marginTop: 8 },
  skillsLabel: { fontSize: 10, color: "#5b6472", marginTop: 18 },
  skill: { fontSize: 10, marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  small: { fontSize: 9, color: "#5b6472" },
  signature: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  revoked: { fontSize: 14, color: "#b42318", fontFamily: "Helvetica-Bold", marginTop: 12 },
});

export interface CertificatePdfLabels {
  certifies: string;
  completed: string;
  skills: string;
  issuedOn: string;
  verifyAt: string;
  id: string;
  revoked: string;
  /** «Carga horaria estimada: N horas», already formatted; omitted when no hours are known. */
  programHours?: string | null;
}

/** Seal width on the page, in points; the height follows the shared view box. */
const SEAL_WIDTH = 84;

/** The seal drawn with react-pdf primitives from the shared shape list (./seal.ts). */
function PdfSeal() {
  return (
    <Svg
      width={SEAL_WIDTH}
      height={(SEAL_WIDTH * SEAL_VIEWBOX.height) / SEAL_VIEWBOX.width}
      viewBox={`0 0 ${SEAL_VIEWBOX.width} ${SEAL_VIEWBOX.height}`}
    >
      {SEAL_SHAPES.map((s, i) =>
        s.kind === "circle" ? (
          <Circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={s.fill ?? "none"}
            {...(s.stroke ? { stroke: s.stroke, strokeWidth: s.strokeWidth } : {})}
          />
        ) : (
          <Path
            key={i}
            d={s.d}
            fill={s.fill ?? "none"}
            {...(s.stroke
              ? {
                  stroke: s.stroke,
                  strokeWidth: s.strokeWidth,
                  strokeLinecap: s.strokeLinecap,
                  strokeLinejoin: s.strokeLinejoin,
                }
              : {})}
          />
        ),
      )}
    </Svg>
  );
}

export async function renderCertificatePdf(
  cert: CertificateDetail,
  labels: CertificatePdfLabels,
  verifyUrl: string,
  issuedOnText: string,
): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`${cert.title} · ${cert.recipientName}`} author={brand.organization}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View>
            <Text style={styles.org}>{brand.organization}</Text>
            <Text style={styles.product}>{brand.productName}</Text>
            <Text style={styles.heading}>{labels.certifies}</Text>
            <Text style={styles.name}>{cert.recipientName}</Text>
            <Text style={styles.heading}>{labels.completed}</Text>
            <Text style={styles.title}>{cert.title}</Text>
            {labels.programHours ? <Text style={styles.hours}>{labels.programHours}</Text> : null}
            {cert.revoked ? <Text style={styles.revoked}>{labels.revoked}</Text> : null}
            <Text style={styles.skillsLabel}>{labels.skills}</Text>
            {cert.skills.map((s) => (
              <Text key={s} style={styles.skill}>
                • {s}
              </Text>
            ))}
          </View>
          <View style={styles.footer}>
            <View>
              <Text style={styles.small}>
                {labels.issuedOn} {issuedOnText}
              </Text>
              <Text style={styles.small}>
                {labels.id} {cert.publicId}
              </Text>
              <Text style={styles.small}>
                {labels.verifyAt} {verifyUrl}
              </Text>
            </View>
            {/* A revoked certificate keeps no seal: the seal reads as "valid" to anyone. */}
            {cert.revoked ? null : <PdfSeal />}
            <View>
              <Text style={styles.signature}>{founder.name}</Text>
              <Text style={styles.small}>{founder.role}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>,
  );
}
