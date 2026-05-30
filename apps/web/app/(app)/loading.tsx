/**
 * App-shell loading skeleton. Shown while a route segment streams in and the
 * local PGlite database hydrates. AppChrome (sidebar, header, tab bar) is
 * already mounted by the layout, so this only fills the main content area —
 * the user sees branded chrome with placeholder blocks, never a blank panel.
 *
 * Decorative only: marked aria-hidden so screen readers skip the placeholders.
 */
export default function AppLoading() {
  return (
    <div
      className="flex animate-pulse flex-col gap-4"
      aria-hidden
      data-testid="app-loading"
    >
      {/* Page heading placeholder */}
      <div className="h-7 w-40 rounded-md bg-surface-card-alt" />

      {/* Stacked card placeholders, matching the /today dose-card rhythm */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border-card bg-surface-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-surface-card-alt" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 rounded bg-surface-card-alt" />
              <div className="h-3 w-1/2 rounded bg-surface-card-alt" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
