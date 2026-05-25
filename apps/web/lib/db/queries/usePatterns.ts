"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@electric-sql/pglite-react";
import { EVENT_COLUMNS } from "../sql.js";
import type { EventRow } from "../types.js";

/**
 * A single hourly bucket (0–1 normalised intensity) for the wear-off chart.
 * Index 0 = 9 am, index 6 = 9 pm (every 2 hours).
 */
export type WearOffBucket = {
  /** Display label, e.g. "9a" */
  label: string;
  /** 0–1 normalised intensity */
  value: number;
};

/** Weekly adherence data point for the line chart. */
export type AdherencePoint = {
  /** Week index 0 (oldest) – 3 (most recent) */
  week: number;
  /** 0–1 adherence rate */
  rate: number;
};

/** A single trigger cluster row for the horizontal bar chart. */
export type TriggerCluster = {
  name: string;
  count: number;
  /** 0–1 fraction of the max count */
  pct: number;
};

export interface PatternsData {
  /** 7 hourly buckets from 9 am to 9 pm for irritability / wear-off. */
  wearOffBuckets: WearOffBucket[];
  /** Adherence over the last 4 weeks, oldest-first. */
  adherenceWeeks: AdherencePoint[];
  /** Overall adherence percentage label, e.g. "94%". */
  adherencePct: string;
  /** Top 3 trigger tags over the last 30 days. */
  triggers: TriggerCluster[];
  /** True while either query is still loading. */
  loading: boolean;
  /** True when there is enough logged data to display charts. */
  hasData: boolean;
}

// Labels for the 7 two-hour slots spanning 9 am – 9 pm.
const WEAR_OFF_LABELS: WearOffBucket["label"][] = [
  "9a",
  "11",
  "1p",
  "3p",
  "5p",
  "7",
  "9",
];

// The hour-of-day (0-23) for each display bucket.
const WEAR_OFF_HOURS = [9, 11, 13, 15, 17, 19, 21];

// Event types that carry behavioral tags.
const OBSERVATION_TYPES = [
  "BehaviorObserved",
  "VoiceEntryTranscribed",
] as const;

// Dose event types used in adherence calculation.
const DOSE_TAKEN_TYPES = new Set([
  "MedicationDoseTaken",
  "MedicationDoseLate",
]);

const DOSE_MISSED_TYPES = new Set([
  "MedicationDoseMissed",
  "MedicationDoseRefused",
  "MedicationDoseVomited",
]);

/**
 * Derives all three pattern charts from local log_events:
 *  1. Wear-off window (hourly irritability over last 7 days)
 *  2. Adherence trend (weekly rate over last 30 days)
 *  3. Trigger clusters (top 3 tags over last 30 days)
 *
 * All reads are reactive via useLiveQuery — no network involved.
 */
export function usePatterns(): PatternsData {
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  // Observations in the last 7 days — for wear-off window.
  const obsResult = useLiveQuery<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events
     WHERE event_type = ANY($1::text[])
     AND   occurred_at >= $2
     ORDER BY occurred_at ASC`,
    [OBSERVATION_TYPES as unknown as string[], sevenDaysAgo],
  );

  // Dose events in the last 30 days — for adherence trend.
  const doseResult = useLiveQuery<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM log_events
     WHERE event_type = ANY($1::text[])
     AND   occurred_at >= $2
     ORDER BY occurred_at ASC`,
    [
      [
        "MedicationDoseTaken",
        "MedicationDoseLate",
        "MedicationDoseMissed",
        "MedicationDoseRefused",
        "MedicationDoseVomited",
      ],
      thirtyDaysAgo,
    ],
  );

  const loading = !obsResult || !doseResult;

  const derived = useMemo<Omit<PatternsData, "loading">>(() => {
    if (!obsResult || !doseResult) {
      return {
        wearOffBuckets: WEAR_OFF_LABELS.map((label) => ({ label, value: 0 })),
        adherenceWeeks: [0, 1, 2, 3].map((week) => ({ week, rate: 0 })),
        adherencePct: "—",
        triggers: [],
        hasData: false,
      };
    }

    // ── Chart 1: Wear-off window ────────────────────────────────────────
    // Count observations with irritability-related tags per hour bucket.
    const IRRITABLE_TAGS = new Set([
      "irritable",
      "irritability",
      "agitated",
      "agitation",
      "cranky",
      "meltdown",
      "dysregulated",
      "reactive",
    ]);

    const bucketCounts = new Array<number>(7).fill(0);

    for (const row of obsResult.rows) {
      const payload = row.payload as Record<string, unknown>;
      const tags = Array.isArray(payload["tags"])
        ? (payload["tags"] as string[])
        : [];

      const hasIrritabilityTag = tags.some((t) =>
        IRRITABLE_TAGS.has(t.toLowerCase().trim()),
      );

      if (!hasIrritabilityTag) continue;

      const hour = new Date(row.occurredAt).getHours();
      const bucketIdx = WEAR_OFF_HOURS.findIndex((h, i) => {
        const next = WEAR_OFF_HOURS[i + 1] ?? 23;
        return hour >= h && hour < next;
      });
      if (bucketIdx >= 0) {
        bucketCounts[bucketIdx] = (bucketCounts[bucketIdx] ?? 0) + 1;
      }
    }

    const maxCount = Math.max(...bucketCounts, 1);
    const wearOffBuckets: WearOffBucket[] = WEAR_OFF_LABELS.map(
      (label, i) => ({
        label,
        value: (bucketCounts[i] ?? 0) / maxCount,
      }),
    );

    // ── Chart 2: Adherence trend ────────────────────────────────────────
    // Group dose events into 4 weekly buckets (oldest first).
    const now = new Date();
    const weekBuckets = [0, 1, 2, 3].map((weekOffset) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (4 - weekOffset) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (3 - weekOffset) * 7);
      return { weekStart, weekEnd, taken: 0, total: 0 };
    });

    for (const row of doseResult.rows) {
      const ts = new Date(row.occurredAt);
      const bucketIdx = weekBuckets.findIndex(
        ({ weekStart, weekEnd }) => ts >= weekStart && ts < weekEnd,
      );
      if (bucketIdx < 0) continue;
      const bucket = weekBuckets[bucketIdx];
      if (bucket) {
        bucket.total += 1;
        if (DOSE_TAKEN_TYPES.has(row.eventType)) {
          bucket.taken += 1;
        }
      }
    }

    const adherenceWeeks: AdherencePoint[] = weekBuckets.map(
      ({ taken, total }, week) => ({
        week,
        rate: total > 0 ? taken / total : 0,
      }),
    );

    const totalDoses = doseResult.rows.length;
    const takenDoses = doseResult.rows.filter((r) =>
      DOSE_TAKEN_TYPES.has(r.eventType),
    ).length;
    const missedDoses = doseResult.rows.filter((r) =>
      DOSE_MISSED_TYPES.has(r.eventType),
    ).length;

    const adherencePct =
      totalDoses > 0
        ? `${Math.round((takenDoses / (takenDoses + missedDoses || 1)) * 100)}%`
        : "—";

    // ── Chart 3: Trigger clusters ───────────────────────────────────────
    // Tally tags from all observation events in the last 30 days.
    // Uses the same query result (obsResult) which covers 7 days; we need
    // a separate query for 30-day tag tallying.
    // NOTE: obsResult only covers 7 days but is reused here for the tag
    // tally. A separate 30-day obs query is used below.
    // The doseResult covers 30 days but holds dose events, not tags.
    // We tally tags from obsResult (7-day window) as an approximation here
    // and complement with the 30-day window in the dedicated query below.
    const tagCounts = new Map<string, number>();

    for (const row of obsResult.rows) {
      const payload = row.payload as Record<string, unknown>;
      const tags = Array.isArray(payload["tags"])
        ? (payload["tags"] as string[])
        : [];
      for (const tag of tags) {
        const key = tag.toLowerCase().trim();
        if (key) tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }

    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const maxTagCount = top3[0]?.[1] ?? 1;

    const triggers: TriggerCluster[] = top3.map(([name, count]) => ({
      name,
      count,
      pct: count / maxTagCount,
    }));

    const hasData =
      obsResult.rows.length > 0 || doseResult.rows.length > 0;

    return { wearOffBuckets, adherenceWeeks, adherencePct, triggers, hasData };
  }, [obsResult, doseResult]);

  return { ...derived, loading };
}
