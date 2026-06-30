import { and, asc, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { db } from './client';
import { newId, now } from './ids';
import {
  compartment,
  item,
  briefing,
  compartment_status,
  weekly_move,
  daily_order,
  notification_schedule,
  webhook_event_log,
  type NewItem,
  type NewCompartment,
} from './schema';

// --- Compartments ----------------------------------------------------------

export async function listCompartments() {
  return db
    .select()
    .from(compartment)
    .where(and(eq(compartment.archived, false), isNull(compartment.deleted_at)))
    .orderBy(asc(compartment.order_index));
}

export async function getCompartment(id: string) {
  const rows = await db.select().from(compartment).where(eq(compartment.id, id));
  return rows[0];
}

export async function createCompartment(values: Omit<NewCompartment, 'id'>) {
  const id = newId();
  await db.insert(compartment).values({ id, ...values });
  return id;
}

export async function updateCompartment(id: string, patch: Partial<NewCompartment>) {
  await db
    .update(compartment)
    .set({ ...patch, updated_at: now() })
    .where(eq(compartment.id, id));
}

export async function setCompartmentBoundary(id: string, open: boolean) {
  // Only one compartment may be "open" at a time (focus mode).
  if (open) {
    await db
      .update(compartment)
      .set({ open_boundary: false, updated_at: now() })
      .where(and(eq(compartment.open_boundary, true), ne(compartment.id, id)));
  }
  await db
    .update(compartment)
    .set({ open_boundary: open, updated_at: now() })
    .where(eq(compartment.id, id));
}

// --- Items / Active / Someday / Parked -------------------------------------

export const ACTIVE_CAP = 7;

export async function listItems(
  compartmentId: string,
  state: 'active' | 'someday' | 'parked' | 'completed' | 'discarded',
) {
  return db
    .select()
    .from(item)
    .where(
      and(
        eq(item.compartment_id, compartmentId),
        eq(item.state, state),
        isNull(item.deleted_at),
      ),
    )
    .orderBy(desc(item.updated_at));
}

export async function listParkedAll() {
  return db
    .select()
    .from(item)
    .where(and(eq(item.state, 'parked'), isNull(item.deleted_at)))
    .orderBy(desc(item.created_at));
}

export async function countActive(compartmentId: string) {
  const rows = await listItems(compartmentId, 'active');
  return rows.length;
}

export async function createItem(values: Omit<NewItem, 'id'>) {
  const id = newId();
  await db.insert(item).values({ id, ...values });
  return id;
}

export async function park(title: string, compartmentId?: string, source: 'app' | 'share' | 'telegram' = 'app') {
  return createItem({
    title,
    compartment_id: compartmentId ?? null,
    state: 'parked',
    source,
  });
}

export async function promoteToActive(itemId: string, compartmentId?: string): Promise<{ ok: true } | { ok: false; reason: 'cap' }>
{
  const rows = await db.select().from(item).where(eq(item.id, itemId));
  const cur = rows[0];
  if (!cur) return { ok: true };
  const targetCompartment = compartmentId ?? cur.compartment_id;
  if (!targetCompartment) throw new Error('compartment required to activate item');
  const active = await countActive(targetCompartment);
  if (active >= ACTIVE_CAP) return { ok: false, reason: 'cap' };
  await db
    .update(item)
    .set({
      state: 'active',
      compartment_id: targetCompartment,
      entered_active_at: now(),
      exited_at: null,
      exit_reason: null,
      updated_at: now(),
    })
    .where(eq(item.id, itemId));
  return { ok: true };
}

/**
 * The Active File has exactly three exits — completed | someday | discarded.
 * Every exit is logged with timestamp + reason (spec C2).
 */
export async function exitItem(
  itemId: string,
  exit: 'completed' | 'someday' | 'discarded',
  reason?: string,
) {
  await db
    .update(item)
    .set({
      state: exit,
      exit_reason: reason ?? null,
      exited_at: now(),
      updated_at: now(),
    })
    .where(eq(item.id, itemId));
}

// --- Briefings -------------------------------------------------------------

export async function createBriefing(weekStart: number) {
  const id = newId();
  await db.insert(briefing).values({ id, week_start: weekStart });
  return id;
}

export async function completeBriefing(id: string, bluf: string, durationSeconds: number) {
  await db
    .update(briefing)
    .set({ completed_at: now(), bluf, duration_seconds: durationSeconds, updated_at: now() })
    .where(eq(briefing.id, id));
}

export async function latestBriefing() {
  const rows = await db
    .select()
    .from(briefing)
    .where(isNull(briefing.deleted_at))
    .orderBy(desc(briefing.week_start))
    .limit(1);
  return rows[0];
}

export async function saveCompartmentStatus(values: {
  briefing_id: string;
  compartment_id: string;
  status_line: string;
  observed?: string | null;
  interpreted?: string | null;
  honesty_checked?: boolean;
}) {
  const id = newId();
  await db.insert(compartment_status).values({ id, ...values });
  return id;
}

export async function saveWeeklyMove(values: {
  briefing_id: string;
  compartment_id: string;
  title: string;
  likelihood_term?: string | null;
  likelihood_value?: number | null;
}) {
  const id = newId();
  await db.insert(weekly_move).values({ id, ...values });
  return id;
}

export async function statusesForBriefing(briefingId: string) {
  return db
    .select()
    .from(compartment_status)
    .where(eq(compartment_status.briefing_id, briefingId));
}

export async function movesForBriefing(briefingId: string) {
  return db.select().from(weekly_move).where(eq(weekly_move.briefing_id, briefingId));
}

// --- Daily orders ----------------------------------------------------------

export const DAILY_ORDER_CAP = 3;

export async function ordersForDate(dateMs: number) {
  return db.select().from(daily_order).where(eq(daily_order.date, dateMs));
}

export async function createDailyOrder(values: {
  date: number;
  title: string;
  parent_item_id?: string | null;
  parent_move_id?: string | null;
}) {
  const existing = await ordersForDate(values.date);
  if (existing.length >= DAILY_ORDER_CAP) {
    throw new Error(`Daily orders capped at ${DAILY_ORDER_CAP}.`);
  }
  const id = newId();
  await db.insert(daily_order).values({ id, ...values });
  return id;
}

export async function markOrderHonored(id: string, honored: boolean, reason?: string) {
  await db
    .update(daily_order)
    .set({ honored, reason: reason ?? null, updated_at: now() })
    .where(eq(daily_order.id, id));
}

// --- Notifications & webhook event log -------------------------------------

export async function upsertNotificationSchedule(values: {
  type: 'daily_orders' | 'weekly_briefing' | 'defaults_review' | 'custom';
  trigger_spec: string;
  local_id?: string | null;
  enabled?: boolean;
}) {
  const existing = await db
    .select()
    .from(notification_schedule)
    .where(eq(notification_schedule.type, values.type));
  if (existing[0]) {
    await db
      .update(notification_schedule)
      .set({ ...values, updated_at: now() })
      .where(eq(notification_schedule.id, existing[0].id));
    return existing[0].id;
  }
  const id = newId();
  await db.insert(notification_schedule).values({ id, ...values });
  return id;
}

export async function listSchedules() {
  return db.select().from(notification_schedule);
}

export async function enqueueWebhook(eventType: string, payload: object) {
  const id = newId();
  await db.insert(webhook_event_log).values({
    id,
    event_type: eventType,
    payload: JSON.stringify(payload),
  });
  return id;
}

export async function undeliveredWebhooks() {
  return db
    .select()
    .from(webhook_event_log)
    .where(eq(webhook_event_log.delivered, false))
    .orderBy(asc(webhook_event_log.created_at));
}

export async function markWebhookDelivered(id: string) {
  await db
    .update(webhook_event_log)
    .set({ delivered: true, updated_at: now() })
    .where(eq(webhook_event_log.id, id));
}

export async function bumpWebhookAttempts(id: string, lastError: string) {
  const rows = await db.select().from(webhook_event_log).where(eq(webhook_event_log.id, id));
  const cur = rows[0];
  await db
    .update(webhook_event_log)
    .set({
      attempts: (cur?.attempts ?? 0) + 1,
      last_error: lastError,
      updated_at: now(),
    })
    .where(eq(webhook_event_log.id, id));
}
