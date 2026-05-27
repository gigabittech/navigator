# Get unblocked

If you're an AI assistant or new dev opening this repo for the first time:

1. **Read `CLAUDE.md` at the root.** It's the rules. Non-negotiable.
2. **Read `docs/architecture.md`.** The "why" behind the rules.
3. **Read `docs/voice.md`.** All user-facing copy goes through this.
4. **Skim `packages/schema/src/event-types.ts`.** This is the heart of
   the data model.
5. **Run `pnpm install && pnpm dev`.** If it doesn't boot, fix the boot
   before anything else.

If you're stuck:
- Schema question? Look at `packages/schema/src/`.
- Visual question? Look at `packages/design-system/src/tokens.css`.
- Voice question? Look at `docs/voice.md`. If still unsure, mirror the
  closest existing string.
- "Where do I put this?" Components next to their route in `_components/`.
  Cross-cutting in `apps/web/components/`. Primitives in the design system.
- Tests? `pnpm test`. Required for any change in `packages/report`.

The four things you do not break:

1. Local-first — no network on the critical path.
2. `log_events` is append-only — never UPDATE, never DELETE.
3. All visuals come from design-system tokens — no raw hex.
4. Voice — sentence case, second person, no exclamation marks, no emoji.
