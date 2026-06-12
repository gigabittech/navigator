"use client";

import { useState } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { Button, Card, Field, Pill } from "@navigator/design-system/components";
import { useCollaborators } from "@/lib/db/queries/useCollaborators";
import {
  inviteCollaborator,
  removeCollaborator,
  type CollaboratorRole,
} from "@/lib/db/mutations/collaborators";
import { isSupabaseConfigured } from "@/lib/config";
import { inviteCollaboratorServer, removeCollaboratorServer } from "../_actions";

const ROLE_LABEL: Record<string, string> = {
  owner: "You",
  co_parent: "Co-parent",
  clinician_view: "Clinician",
};

const ROLE_TONE: Record<string, "accent" | "neutral" | "info"> = {
  owner: "accent",
  co_parent: "neutral",
  clinician_view: "info",
};

function initials(name: string | null, email: string): string {
  const base = name?.trim() || email;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function CoParents({ childId }: { childId: string | undefined }) {
  const db = usePGlite();
  const people = useCollaborators(childId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("co_parent");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!childId || busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (isSupabaseConfigured()) {
        // Server first: grants real access + sends the invite email. The
        // local mirror then uses their REAL user id, so this row and the
        // synced one are the same person.
        const server = await inviteCollaboratorServer({ childId, email, role });
        if (!server.ok) {
          setNote(server.message);
          return;
        }
        await inviteCollaborator(db, childId, email, role, server.collaboratorId);
        setNote(server.message);
        setEmail("");
      } else {
        const res = await inviteCollaborator(db, childId, email, role);
        setNote(res.message);
        if (res.ok) setEmail("");
      }
    } catch {
      setNote("Couldn't add them. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(collaboratorId: string) {
    if (!childId) return;
    if (isSupabaseConfigured()) {
      // Server first — a local-only delete would be resurrected by the next
      // sync pull.
      const res = await removeCollaboratorServer({ childId, collaboratorId });
      if (!res.ok) {
        setNote(res.message);
        return;
      }
    }
    await removeCollaborator(db, childId, collaboratorId);
  }

  return (
    <section id="coparents" className="flex flex-col gap-3 scroll-mt-20">
      <h2 className="text-sm font-semibold text-fg-2">Co-parents &amp; clinicians</h2>

      <Card alt elevation="flat" className="p-4 flex flex-col gap-3">
        <ul className="flex flex-col gap-2" aria-label="People who share this child">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-card text-2xs font-semibold text-fg-2"
              >
                {initials(person.fullName, person.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg-1">
                  {person.fullName ?? person.email}
                </span>
                {person.fullName ? (
                  <span className="block truncate text-2xs text-fg-4">{person.email}</span>
                ) : null}
              </span>
              <Pill tone={ROLE_TONE[person.role] ?? "neutral"}>
                {ROLE_LABEL[person.role] ?? person.role}
              </Pill>
              {person.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => remove(person.id)}
                  className="rounded-md px-2 py-1 text-2xs text-fg-4 hover:text-danger-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
                  aria-label={`Remove ${person.fullName ?? person.email}`}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card alt elevation="flat" className="p-4 flex flex-col gap-3">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field
            label="Invite by email"
            type="email"
            inputMode="email"
            placeholder="co-parent@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint={
              isSupabaseConfigured()
                ? "They'll get an email. Signing in with this address shows them the shared record."
                : "They'll get access on their own device once sync is on."
            }
          />
          <div className="flex items-center gap-2" role="group" aria-label="Their role">
            {(["co_parent", "clinician_view"] as CollaboratorRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={[
                  "min-h-tap flex-1 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent",
                  role === r
                    ? "border-border-accent bg-accent-50 text-accent-700"
                    : "border-border-card text-fg-2",
                ].join(" ")}
              >
                {r === "co_parent" ? "Co-parent" : "Clinician (read-only)"}
              </button>
            ))}
          </div>
          <Button type="submit" fullWidth disabled={busy || !childId}>
            {busy ? "Adding…" : "Add to this child"}
          </Button>
          {note ? <p className="text-2xs text-fg-3">{note}</p> : null}
        </form>
      </Card>
    </section>
  );
}
