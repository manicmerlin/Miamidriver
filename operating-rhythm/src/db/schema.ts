import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Spec §6 — all tables carry id, created_at, updated_at, deleted_at (soft
// delete). user_id is reserved for Phase 2 sync.

const baseColumns = () => ({
  id: text('id').primaryKey(),
  created_at: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
  updated_at: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
  deleted_at: integer('deleted_at'),
  user_id: text('user_id'),
});

// --- Phase 1 core ----------------------------------------------------------

export const compartment = sqliteTable('compartment', {
  ...baseColumns(),
  name: text('name').notNull(),
  order_index: integer('order_index').notNull().default(0),
  open_boundary: integer('open_boundary', { mode: 'boolean' }).notNull().default(false),
  sop_normal: text('sop_normal'),
  sop_minimum: text('sop_minimum'),
  sop_keystone: text('sop_keystone'),
  defaults_reviewed_at: integer('defaults_reviewed_at'),
  review_cycle: text('review_cycle', { enum: ['weekly', 'biweekly', 'monthly'] })
    .notNull()
    .default('weekly'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

export const item = sqliteTable('item', {
  ...baseColumns(),
  compartment_id: text('compartment_id').references(() => compartment.id),
  title: text('title').notNull(),
  notes: text('notes'),
  state: text('state', {
    enum: ['parked', 'active', 'someday', 'completed', 'discarded'],
  })
    .notNull()
    .default('parked'),
  exit_reason: text('exit_reason'),
  entered_active_at: integer('entered_active_at'),
  exited_at: integer('exited_at'),
  source: text('source', { enum: ['app', 'share', 'telegram'] }).notNull().default('app'),
  likelihood_term: text('likelihood_term'),
  likelihood_value: integer('likelihood_value'),
  confidence_level: text('confidence_level', { enum: ['low', 'moderate', 'high'] }),
});

export const briefing = sqliteTable('briefing', {
  ...baseColumns(),
  week_start: integer('week_start').notNull(), // unix-ms, Monday 00:00
  completed_at: integer('completed_at'),
  bluf: text('bluf'),
  duration_seconds: integer('duration_seconds'),
});

export const compartment_status = sqliteTable('compartment_status', {
  ...baseColumns(),
  briefing_id: text('briefing_id').notNull().references(() => briefing.id),
  compartment_id: text('compartment_id').notNull().references(() => compartment.id),
  status_line: text('status_line').notNull(),
  observed: text('observed'),
  interpreted: text('interpreted'),
  honesty_checked: integer('honesty_checked', { mode: 'boolean' }).notNull().default(false),
});

export const weekly_move = sqliteTable('weekly_move', {
  ...baseColumns(),
  briefing_id: text('briefing_id').notNull().references(() => briefing.id),
  compartment_id: text('compartment_id').notNull().references(() => compartment.id),
  title: text('title').notNull(),
  likelihood_term: text('likelihood_term'),
  likelihood_value: integer('likelihood_value'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
});

export const daily_order = sqliteTable('daily_order', {
  ...baseColumns(),
  date: integer('date').notNull(), // unix-ms, midnight local
  title: text('title').notNull(),
  parent_item_id: text('parent_item_id').references(() => item.id),
  parent_move_id: text('parent_move_id').references(() => weekly_move.id),
  honored: integer('honored', { mode: 'boolean' }),
  reason: text('reason'),
});

// --- Phase 2 stubs (schema present, UI not yet built) ----------------------

export const indicator = sqliteTable('indicator', {
  ...baseColumns(),
  compartment_id: text('compartment_id').notNull().references(() => compartment.id),
  watch_question: text('watch_question').notNull(),
  direction: text('direction', { enum: ['backward', 'forward'] }).notNull().default('forward'),
  tripped: integer('tripped', { mode: 'boolean' }).notNull().default(false),
  last_reviewed_at: integer('last_reviewed_at'),
  notes: text('notes'),
});

export const assumption = sqliteTable('assumption', {
  ...baseColumns(),
  parent_type: text('parent_type', { enum: ['goal', 'item', 'decision'] }).notNull(),
  parent_id: text('parent_id').notNull(),
  text: text('text').notNull(),
  confidence: integer('confidence'),
  is_key_uncertainty: integer('is_key_uncertainty', { mode: 'boolean' }).notNull().default(false),
  change_my_mind: text('change_my_mind'),
});

export const premortem = sqliteTable('premortem', {
  ...baseColumns(),
  parent_item_id: text('parent_item_id').notNull().references(() => item.id),
  imagined_date: integer('imagined_date').notNull(),
  failure_modes: text('failure_modes').notNull(), // JSON array
});

export const aar = sqliteTable('aar', {
  ...baseColumns(),
  parent_type: text('parent_type', { enum: ['item', 'week', 'missed_commitment'] }).notNull(),
  parent_id: text('parent_id').notNull(),
  supposed: text('supposed').notNull(),
  actual: text('actual').notNull(),
  why_diff: text('why_diff'),
  sustain_improve: text('sustain_improve'),
});

export const decision = sqliteTable('decision', {
  ...baseColumns(),
  situation: text('situation').notNull(),
  options: text('options').notNull(), // JSON
  chosen: text('chosen').notNull(),
  expected_outcome: text('expected_outcome'),
  likelihood_term: text('likelihood_term'),
  likelihood_value: integer('likelihood_value'),
  review_date: integer('review_date').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }),
  resolution_note: text('resolution_note'),
});

export const calibration_result = sqliteTable('calibration_result', {
  ...baseColumns(),
  decision_id: text('decision_id').notNull().references(() => decision.id),
  predicted_value: integer('predicted_value').notNull(),
  outcome: integer('outcome', { mode: 'boolean' }).notNull(),
  bucket: integer('bucket').notNull(),
});

// --- Phase 1 infra ---------------------------------------------------------

export const notification_schedule = sqliteTable('notification_schedule', {
  ...baseColumns(),
  type: text('type', {
    enum: ['daily_orders', 'weekly_briefing', 'defaults_review', 'custom'],
  }).notNull(),
  trigger_spec: text('trigger_spec').notNull(), // JSON
  local_id: text('local_id'), // expo-notifications identifier
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export const sync_meta = sqliteTable('sync_meta', {
  ...baseColumns(),
  last_pulled_at: integer('last_pulled_at'),
  last_pushed_at: integer('last_pushed_at'),
});

export const webhook_event_log = sqliteTable('webhook_event_log', {
  ...baseColumns(),
  event_type: text('event_type').notNull(),
  payload: text('payload').notNull(), // JSON
  delivered: integer('delivered', { mode: 'boolean' }).notNull().default(false),
  attempts: integer('attempts').notNull().default(0),
  last_error: text('last_error'),
});

// --- App settings (KV; survives reinstall if synced) -----------------------

export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value'),
  updated_at: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export type Compartment = typeof compartment.$inferSelect;
export type NewCompartment = typeof compartment.$inferInsert;
export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;
export type Briefing = typeof briefing.$inferSelect;
export type CompartmentStatus = typeof compartment_status.$inferSelect;
export type WeeklyMove = typeof weekly_move.$inferSelect;
export type DailyOrder = typeof daily_order.$inferSelect;
export type NotificationSchedule = typeof notification_schedule.$inferSelect;
