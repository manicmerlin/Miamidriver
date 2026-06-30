import {
  bumpWebhookAttempts,
  enqueueWebhook,
  markWebhookDelivered,
  undeliveredWebhooks,
  park,
} from '../db/repos';
import { getSetting, SettingKey } from '../db/settings';
import { newId } from '../db/ids';

const MAX_ATTEMPTS = 8;

export type OutboundEvent =
  | 'briefing.completed'
  | 'thought.parked'
  | 'indicator.tripped'
  | 'order.unhonored'
  | 'decision.due';

/**
 * Path B (spec §9.2) — fire-and-forget event emit. Always enqueues to the
 * outbox first; the flusher will deliver.
 */
export async function emit(eventType: OutboundEvent, data: Record<string, unknown>) {
  const idempotency_key = newId();
  await enqueueWebhook(eventType, {
    event_type: eventType,
    occurred_at: Date.now(),
    user_id: 'local',
    data,
    idempotency_key,
  });
  // Best-effort immediate flush; failure is non-fatal — the outbox catches it.
  void flushOutbox().catch(() => undefined);
}

export async function flushOutbox(): Promise<{ delivered: number; failed: number }> {
  const base = (await getSetting(SettingKey.N8N_WEBHOOK_BASE))?.trim();
  const token = (await getSetting(SettingKey.N8N_WEBHOOK_TOKEN))?.trim();
  if (!base) return { delivered: 0, failed: 0 };

  const url = `${base.replace(/\/+$/, '')}/operating-rhythm/event`;
  const pending = await undeliveredWebhooks();
  let delivered = 0;
  let failed = 0;

  for (const row of pending) {
    if (row.attempts >= MAX_ATTEMPTS) continue;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: row.payload,
      });
      if (!res.ok) {
        await bumpWebhookAttempts(row.id, `HTTP ${res.status}`);
        failed++;
        continue;
      }
      await markWebhookDelivered(row.id);
      delivered++;
    } catch (err) {
      await bumpWebhookAttempts(row.id, String((err as Error).message ?? err));
      failed++;
    }
  }

  return { delivered, failed };
}

/**
 * Path C (spec §9.3) — pull Telegram-captured items from n8n.
 *
 * Expected n8n response shape:
 *   { items: [{ title: string, compartment?: string }, ...], cursor?: string }
 *
 * The n8n workflow is responsible for persisting which items have been
 * shipped (using the cursor we send back). The app remains stateless.
 */
export async function pullRemoteCaptures(): Promise<{ pulled: number }> {
  const base = (await getSetting(SettingKey.N8N_WEBHOOK_BASE))?.trim();
  const token = (await getSetting(SettingKey.N8N_WEBHOOK_TOKEN))?.trim();
  if (!base) return { pulled: 0 };
  const url = `${base.replace(/\/+$/, '')}/operating-rhythm/inbound`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return { pulled: 0 };
    const json = (await res.json()) as { items?: { title: string; compartment?: string }[] };
    const items = json.items ?? [];
    for (const it of items) {
      await park(it.title, undefined, 'telegram');
    }
    return { pulled: items.length };
  } catch {
    return { pulled: 0 };
  }
}
