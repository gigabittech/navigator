/**
 * @navigator/report — pure report generation.
 *
 * Input: a child profile + a window of `log_events`. Output: a structured
 * `Report` object. Rendering (PDF, HTML, AI narrative) is decoupled.
 *
 * This package has no I/O. No DB calls, no fetch, no localStorage. That
 * keeps it trivially testable and reusable: the same generator runs in
 * the browser (PWA), in a Supabase Edge Function (PDF email), and in
 * unit tests.
 */

export * from "./generate.js";
export * from "./sections.js";
export * from "./types.js";
export * from "./pseudonymize.js";
