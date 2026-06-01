/**
 * PDF rendering for the 90-day report. Imported dynamically from the report
 * route so @react-pdf/renderer (heavy) is code-split out of the app shell.
 *
 * Uses the built-in Helvetica family — no font embedding, smaller output.
 */

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Report } from "@navigator/report";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#0F172A", lineHeight: 1.5 },
  brand: { fontSize: 10, color: "#4F46E5", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 6 },
  range: { fontSize: 10, color: "#64748B", marginTop: 2 },
  highlights: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 18, marginBottom: 8 },
  stat: { width: 110 },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  statLabel: { fontSize: 9, color: "#64748B", marginTop: 2 },
  section: { marginTop: 18 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  sectionStat: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  statPositive: { color: "#15803D" },
  statFlag: { color: "#B45309" },
  body: { fontSize: 11, color: "#334155" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginTop: 8 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#94A3B8" },
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReportDocument({ report }: { report: Report }) {
  const range = `${formatDate(report.rangeStart)} – ${formatDate(report.rangeEnd)}`;
  return (
    <Document title={`Navigator report — ${report.child.preferredName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>NAVIGATOR</Text>
        <Text style={styles.title}>{report.child.preferredName} — care summary</Text>
        <Text style={styles.range}>{range}</Text>
        {report.child.diagnosesNotes ? (
          <Text style={styles.range}>{report.child.diagnosesNotes}</Text>
        ) : null}

        <View style={styles.highlights}>
          <Stat value={`${report.highlights.adherenceRate}%`} label="Adherence" />
          <Stat value={`${report.highlights.daysCovered}`} label="Days covered" />
          <Stat value={`${report.highlights.eventsLogged}`} label="Events logged" />
          <Stat value={`${report.highlights.medicationsTracked}`} label="Medications" />
        </View>
        <View style={styles.divider} />

        {report.narrative ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.body}>{report.narrative}</Text>
          </View>
        ) : null}

        {report.sections.map((s) => (
          <View key={s.id} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              {s.stat ? (
                <Text
                  style={[
                    styles.sectionStat,
                    s.stat.direction === "positive" ? styles.statPositive : styles.statFlag,
                  ]}
                >
                  {/* Paired label so the signal is never color-alone (a11y). */}
                  {s.stat.value} · {s.stat.direction === "positive" ? "on track" : "review"}
                </Text>
              ) : null}
            </View>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Generated ${formatDate(report.generatedAt)} · Navigator · page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function buildReportBlob(report: Report): Promise<Blob> {
  return pdf(<ReportDocument report={report} />).toBlob();
}
