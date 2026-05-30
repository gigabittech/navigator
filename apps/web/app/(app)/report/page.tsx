"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card } from "@navigator/design-system/components";
import { generateReport, type Report } from "@navigator/report";
import type { LogEvent, Medication } from "@navigator/schema";
import { loadReportWindow } from "@/lib/db/queries/reportWindow";
import { useChild } from "@/lib/db/queries/useChild";
import { useNextAppointment } from "@/lib/db/queries/useNextAppointment";
import { generateNarrative, NarrativeUnavailableError } from "@/lib/ai/narrative";

const WINDOW_DAYS = 90;

/* ── Inline icons ── */
function SparklesIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

/* ── Report header ── */
function ReportHeader({
  childName,
  rangeStart,
  rangeEnd,
}: {
  childName: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const format = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const generatedAt = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px 16px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-success-fg)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "var(--cta-success)",
            color: "var(--fg-on-accent)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          N
        </span>
        Navigator
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 4px",
          letterSpacing: "-0.02em",
          color: "var(--fg-1)",
        }}
      >
        90-day summary
      </h2>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-4)",
          overflowWrap: "anywhere",
        }}
      >
        {childName} · {format(rangeStart)} – {format(rangeEnd)} · Generated {generatedAt}
      </div>
    </div>
  );
}

/* ── Pre-visit AI summary banner ── */
function PreVisitBanner({ itemCount }: { itemCount: number }) {
  const appt = useNextAppointment();

  if (!appt) return null;

  const apptDate = new Date(appt.scheduledFor);
  const dateLabel = apptDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const withLabel = appt.with ?? appt.kind;

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "var(--gradient-report-banner)",
        border: "1px solid var(--accent-gold-bd)",
        borderRadius: 12,
        fontSize: 12.5,
        color: "var(--fg-2)",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ color: "var(--accent-gold-600)", flexShrink: 0 }}>
        <SparklesIcon />
      </span>
      <span>
        <strong>Pre-visit summary</strong> for {dateLabel} with {withLabel}.{" "}
        {itemCount} thing{itemCount === 1 ? "" : "s"} worth raising.
      </span>
    </div>
  );
}

/* ── Section stat with direction badge ── */
function SectionStat({
  value,
  direction,
}: {
  value: string;
  direction: "positive" | "flag";
}) {
  const dirStyles: Record<"positive" | "flag", React.CSSProperties> = {
    positive: {
      background: "var(--color-success-bg)",
      color: "var(--color-success-fg)",
    },
    flag: {
      background: "var(--color-warning-bg)",
      color: "var(--color-warning-fg)",
    },
  };
  // Status is never color-alone: pair each direction with a label.
  const badge = direction === "positive" ? "on track" : "review";

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--fg-1)",
        whiteSpace: "nowrap",
        textAlign: "right",
        flexShrink: 0,
      }}
    >
      {value}
      <br />
      <span
        style={{
          display: "inline-block",
          marginTop: 4,
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 9999,
          ...dirStyles[direction],
        }}
      >
        {badge}
      </span>
    </div>
  );
}

/* ── Section row ── */
function SectionRow({
  section,
}: {
  section: Report["sections"][number];
}) {
  // Use the typed stat the generator computed from this section's data.
  // No regex-scraping of prose — only render a stat when one was derived.
  const stat = section.stat;

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-4)",
          marginBottom: 4,
        }}
      >
        {section.title}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 12,
        }}
      >
        <p
          className="text-sm text-fg-2"
          style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-line", minWidth: 0, overflowWrap: "anywhere" }}
        >
          {section.body}
        </p>
        {stat ? <SectionStat value={stat.value} direction={stat.direction} /> : null}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const db = usePGlite();
  const child = useChild();

  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [exporting, setExporting] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function generate() {
    if (!child) return;
    setStatus("generating");
    setNote(null);
    try {
      const rangeEnd = new Date();
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - WINDOW_DAYS);
      const window = await loadReportWindow(db, child.id, rangeStart, rangeEnd);
      const result = generateReport({
        child: {
          id: window.child.id,
          preferredName: window.child.preferredName,
          dateOfBirth: window.child.dateOfBirth,
          diagnosesNotes: window.child.diagnosesNotes,
        },
        medications: window.medications as unknown as Medication[],
        events: window.events as unknown as LogEvent[],
        rangeStart,
        rangeEnd,
      });
      setReport(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function exportPdf() {
    if (!report) return;
    setExporting(true);
    try {
      const { buildReportBlob } = await import("@/lib/pdf/reportPdf");
      const blob = await buildReportBlob(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `navigator-report-${report.rangeEnd.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNote("Couldn't build the PDF. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function addNarrative() {
    if (!report) return;
    setNarrating(true);
    setNote(null);
    try {
      const narrative = await generateNarrative(report);
      setReport({ ...report, narrative });
    } catch (err) {
      setNote(
        err instanceof NarrativeUnavailableError
          ? err.message
          : "The summary service didn't respond. Try again.",
      );
    } finally {
      setNarrating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="report-content">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">90-day report</h1>
      </header>

      {!report ? (
        <Card>
          <p className="text-base text-fg-2">
            Pull the last {WINDOW_DAYS} days of doses and observations into one summary
            to bring to the next appointment.
          </p>
          <div className="mt-4">
            <Button size="lg" onClick={generate} disabled={status === "generating" || !child}>
              {status === "generating" ? "Pulling 90 days of events…" : "Generate report"}
            </Button>
          </div>
          {status === "error" ? (
            <p className="text-sm text-danger-fg mt-3">
              Couldn&rsquo;t build the report. Your data is safe — try again.
            </p>
          ) : null}
        </Card>
      ) : (
        <>
          {/* Branded report header */}
          <Card>
            <ReportHeader
              childName={report.child.preferredName}
              rangeStart={new Date(report.rangeStart)}
              rangeEnd={new Date(report.rangeEnd)}
            />

            {/* Pre-visit AI summary banner */}
            <PreVisitBanner itemCount={report.sections.length} />

            {/* Highlight stats — two-up on phones, four-up once there's room. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Highlight value={`${report.highlights.adherenceRate}%`} label="Adherence" />
              <Highlight value={`${report.highlights.daysCovered}`} label="Days covered" />
              <Highlight value={`${report.highlights.eventsLogged}`} label="Events logged" />
              <Highlight value={`${report.highlights.medicationsTracked}`} label="Medications" />
            </div>
          </Card>

          {/* AI narrative summary */}
          {report.narrative ? (
            <Card>
              <h2 className="text-lg font-semibold mb-1">Summary</h2>
              <p className="text-sm text-fg-2 whitespace-pre-line">{report.narrative}</p>
            </Card>
          ) : null}

          {/* Section rows with stat badges */}
          {report.sections.length > 0 ? (
            <Card alt elevation="flat">
              {report.sections.map((s) => (
                <SectionRow key={s.id} section={s} />
              ))}
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={exportPdf} disabled={exporting}>
              {exporting ? "Building PDF…" : "Export PDF"}
            </Button>
            <Button variant="secondary" onClick={addNarrative} disabled={narrating}>
              {narrating ? "Writing summary…" : "Add AI summary"}
            </Button>
            <Button variant="ghost" onClick={generate} disabled={status === "generating"}>
              Refresh
            </Button>
          </div>

          {note ? <p className="text-sm text-fg-3">{note}</p> : null}
        </>
      )}
    </div>
  );
}

function Highlight({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="metric truncate">{value}</p>
      <p className="text-xs text-fg-3 mt-1">{label}</p>
    </div>
  );
}
