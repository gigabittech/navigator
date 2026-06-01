-- ============================================================
-- Navigator — Web Push subscriptions for dose reminders
-- 0009_push_subscriptions.sql
-- ============================================================
-- One row per device subscription. The send_reminders edge function reads these
-- to deliver dose reminders via Web Push. A device may subscribe for a child it
-- has access to; the unique endpoint makes re-subscribing idempotent.
--
-- RLS: a user may only see / manage subscriptions tied to a child they can
-- access (owner or collaborator), reusing has_child_access() from 0002.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  -- The device that owns this subscription (matches log_events.client_id).
  client_id   TEXT NOT NULL,
  -- Web Push endpoint + keys (from PushSubscription.toJSON()).
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subs_child_idx ON push_subscriptions(child_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_select_accessible ON push_subscriptions
  FOR SELECT USING (has_child_access(child_id));

CREATE POLICY push_subs_insert_accessible ON push_subscriptions
  FOR INSERT WITH CHECK (has_child_access(child_id));

CREATE POLICY push_subs_update_accessible ON push_subscriptions
  FOR UPDATE USING (has_child_access(child_id)) WITH CHECK (has_child_access(child_id));

CREATE POLICY push_subs_delete_accessible ON push_subscriptions
  FOR DELETE USING (has_child_access(child_id));
