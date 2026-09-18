import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
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
