"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card } from "@navigator/design-system/components";
import { generateReport, type Report } from "@navigator/report";
import type { LogEvent, Medication } from "@navigator/schema";
import { loadReportWindow } from "@/lib/db/queries/reportWindow";
import { useChild } from "@/lib/db/queries/useChild";
import { generateNarrative, NarrativeUnavailableError } from "@/lib/ai/narrative";

const WINDOW_DAYS = 90;

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
    <div className="flex flex-col gap-4">
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
          <Card>
            <p className="eyebrow mb-2">{report.child.preferredName}</p>
            <div className="grid grid-cols-2 gap-4">
              <Highlight value={`${report.highlights.adherenceRate}%`} label="Adherence" />
              <Highlight value={`${report.highlights.daysCovered}`} label="Days covered" />
              <Highlight value={`${report.highlights.eventsLogged}`} label="Events logged" />
              <Highlight value={`${report.highlights.medicationsTracked}`} label="Medications" />
            </div>
          </Card>

          {report.narrative ? (
            <Card>
              <h2 className="text-lg font-semibold mb-1">Summary</h2>
              <p className="text-sm text-fg-2 whitespace-pre-line">{report.narrative}</p>
            </Card>
          ) : null}

          {report.sections.map((s) => (
            <Card key={s.id} alt elevation="flat">
              <h2 className="text-lg font-semibold mb-1">{s.title}</h2>
              <p className="text-sm text-fg-2 whitespace-pre-line">{s.body}</p>
            </Card>
          ))}

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
    <div>
      <p className="metric">{value}</p>
      <p className="text-xs text-fg-3 mt-1">{label}</p>
    </div>
  );
}
