"use client";

import { useMemo } from "react";
import { Card, Pill } from "@navigator/design-system/components";
import { usePatterns } from "@/lib/db/queries/usePatterns";

/**
 * /patterns — three data-driven charts derived entirely from the local PGlite
 * database. No network required; charts update reactively as events are logged.
 *
 * Charts:
 *   1. Wear-off window — irritability count by hour of day (last 7 days)
 *   2. Adherence trend — weekly dose adherence rate (last 30 days)
 *   3. Trigger clusters — most-tagged observations (last 30 days)
 */
export default function PatternsPage() {
  const { wearOffBuckets, adherenceWeeks, adherencePct, triggers, loading, hasData } =
    usePatterns();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader />
        <Card alt>
          <p className="text-sm text-fg-3">Loading patterns…</p>
        </Card>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader />
        <Card alt>
          <p className="text-sm text-fg-3">
            Nothing logged yet — patterns will appear after a few days of logging.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader />
      <WearOffChart buckets={wearOffBuckets} />
      <AdherenceChart weeks={adherenceWeeks} pct={adherencePct} />
      <TriggerClustersChart triggers={triggers} />
    </div>
  );
}

/* ─── Page header ─────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <header className="flex items-baseline justify-between">
      <h1 className="text-2xl font-bold tracking-tight">What&rsquo;s emerging</h1>
      <span className="text-xs text-fg-3 uppercase tracking-eyebrow">Patterns · 30 days</span>
    </header>
  );
}

/* ─── Chart 1: Wear-off window ────────────────────────────────────── */

interface WearOffChartProps {
  buckets: Array<{ label: string; value: number }>;
}

function WearOffChart({ buckets }: WearOffChartProps) {
  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-fg-1">Wear-off window</p>
          <p className="text-xs text-fg-3 mt-0.5">Irritability intensity by hour · last 7 days</p>
        </div>
        <Pill tone="warning">Emerging</Pill>
      </div>

      {/* Bar chart */}
      <div
        role="img"
        aria-label="Hourly irritability bar chart"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          height: 100,
          alignItems: "end",
          marginBottom: 8,
        }}
      >
        {buckets.map(({ label, value }) => {
          const isWarn = value > 0.7;
          return (
            <div
              key={label}
              title={`${label}: ${Math.round(value * 100)}% intensity`}
              style={{
                background: "var(--border-subtle)",
                borderRadius: "4px 4px 2px 2px",
                position: "relative",
                height: "100%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${Math.max(value * 100, 4)}%`,
                  background: isWarn ? "var(--amber-500)" : "var(--emerald-500)",
                  borderRadius: "4px 4px 2px 2px",
                  transition: "height 300ms var(--ease-out)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Axis labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-3)",
          textAlign: "center",
        }}
        aria-hidden
      >
        {buckets.map(({ label }) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </Card>
  );
}

/* ─── Chart 2: Adherence trend ────────────────────────────────────── */

interface AdherenceChartProps {
  weeks: Array<{ week: number; rate: number }>;
  pct: string;
}

function AdherenceChart({ weeks, pct }: AdherenceChartProps) {
  // Map 4 weekly rates to SVG coordinates within viewBox="0 0 280 110".
  // Y axis: rate 1.0 → y=10, rate 0.0 → y=100 (leave 10px margin top/bottom).
  const points = useMemo(() => {
    return weeks.map(({ week, rate }) => {
      const x = week === 0 ? 0 : (week / (weeks.length - 1)) * 280;
      const y = 10 + (1 - rate) * 90;
      return { x, y };
    });
  }, [weeks]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    if (!first) return "";
    const start = `M${first.x},${first.y}`;
    const rest = points
      .slice(1)
      .map(({ x, y }) => `L${x},${y}`)
      .join(" ");
    return `${start} ${rest}`;
  }, [points]);

  const fillPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${linePath} L280,110 L0,110 Z`;
  }, [linePath, points]);

  const lastPoint = points[points.length - 1];

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-fg-1">Adherence · 30 days</p>
          <p className="text-xs text-fg-3 mt-0.5">{pct} on-time across logged doses</p>
        </div>
        <Pill tone="success">{pct}</Pill>
      </div>

      {/* SVG line chart */}
      <svg
        viewBox="0 0 280 110"
        preserveAspectRatio="none"
        style={{ width: "100%", height: 110, overflow: "visible" }}
        role="img"
        aria-label={`Adherence trend line chart — ${pct} overall`}
      >
        <defs>
          <linearGradient id="adherence-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--emerald-600)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--emerald-600)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {fillPath ? (
          <path d={fillPath} fill="url(#adherence-gradient)" />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="var(--emerald-600)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {lastPoint ? (
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="var(--emerald-600)" />
        ) : null}
      </svg>
    </Card>
  );
}

/* ─── Chart 3: Trigger clusters ───────────────────────────────────── */

interface TriggerClustersChartProps {
  triggers: Array<{ name: string; count: number; pct: number }>;
}

function TriggerClustersChart({ triggers }: TriggerClustersChartProps) {
  const isEmpty = triggers.length === 0;

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-fg-1">Trigger clusters</p>
          <p className="text-xs text-fg-3 mt-0.5">Top tags · last 7 days</p>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-fg-3">No tagged observations yet.</p>
      ) : (
        <div
          role="list"
          aria-label="Top trigger tags"
          style={{ display: "grid", gap: 10 }}
        >
          {triggers.map(({ name, count, pct }, idx) => {
            // First two entries show as warning (amber), rest as success (green).
            const isWarn = idx < 2;
            return (
              <div
                key={name}
                role="listitem"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    className="text-sm font-semibold text-fg-1"
                    style={{ marginBottom: 4, textTransform: "capitalize" }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--border-subtle)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                    role="presentation"
                  >
                    <div
                      style={{
                        width: `${Math.max(pct * 100, 4)}%`,
                        height: "100%",
                        background: isWarn
                          ? "var(--amber-500)"
                          : "var(--emerald-500)",
                        borderRadius: 3,
                        transition: "width 300ms var(--ease-out)",
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-xs font-semibold text-fg-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
