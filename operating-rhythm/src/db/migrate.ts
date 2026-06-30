import type * as SQLite from 'expo-sqlite';

// Hand-rolled initial migration. Once you wire `drizzle-kit generate`,
// switch this for the generated migrations + drizzle-orm/expo-sqlite/migrator.
// Idempotent: every CREATE uses IF NOT EXISTS.

const INITIAL_SQL = `
CREATE TABLE IF NOT EXISTS compartment (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  open_boundary INTEGER NOT NULL DEFAULT 0,
  sop_normal TEXT,
  sop_minimum TEXT,
  sop_keystone TEXT,
  defaults_reviewed_at INTEGER,
  review_cycle TEXT NOT NULL DEFAULT 'weekly',
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  compartment_id TEXT REFERENCES compartment(id),
  title TEXT NOT NULL,
  notes TEXT,
  state TEXT NOT NULL DEFAULT 'parked',
  exit_reason TEXT,
  entered_active_at INTEGER,
  exited_at INTEGER,
  source TEXT NOT NULL DEFAULT 'app',
  likelihood_term TEXT,
  likelihood_value INTEGER,
  confidence_level TEXT
);
CREATE INDEX IF NOT EXISTS idx_item_compartment ON item(compartment_id);
CREATE INDEX IF NOT EXISTS idx_item_state ON item(state);

CREATE TABLE IF NOT EXISTS briefing (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  week_start INTEGER NOT NULL,
  completed_at INTEGER,
  bluf TEXT,
  duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS compartment_status (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  briefing_id TEXT NOT NULL REFERENCES briefing(id),
  compartment_id TEXT NOT NULL REFERENCES compartment(id),
  status_line TEXT NOT NULL,
  observed TEXT,
  interpreted TEXT,
  honesty_checked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_move (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  briefing_id TEXT NOT NULL REFERENCES briefing(id),
  compartment_id TEXT NOT NULL REFERENCES compartment(id),
  title TEXT NOT NULL,
  likelihood_term TEXT,
  likelihood_value INTEGER,
  completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_order (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  date INTEGER NOT NULL,
  title TEXT NOT NULL,
  parent_item_id TEXT REFERENCES item(id),
  parent_move_id TEXT REFERENCES weekly_move(id),
  honored INTEGER,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_daily_order_date ON daily_order(date);

CREATE TABLE IF NOT EXISTS indicator (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  compartment_id TEXT NOT NULL REFERENCES compartment(id),
  watch_question TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'forward',
  tripped INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS assumption (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  parent_type TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  text TEXT NOT NULL,
  confidence INTEGER,
  is_key_uncertainty INTEGER NOT NULL DEFAULT 0,
  change_my_mind TEXT
);

CREATE TABLE IF NOT EXISTS premortem (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  parent_item_id TEXT NOT NULL REFERENCES item(id),
  imagined_date INTEGER NOT NULL,
  failure_modes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aar (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  parent_type TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  supposed TEXT NOT NULL,
  actual TEXT NOT NULL,
  why_diff TEXT,
  sustain_improve TEXT
);

CREATE TABLE IF NOT EXISTS decision (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  situation TEXT NOT NULL,
  options TEXT NOT NULL,
  chosen TEXT NOT NULL,
  expected_outcome TEXT,
  likelihood_term TEXT,
  likelihood_value INTEGER,
  review_date INTEGER NOT NULL,
  resolved INTEGER,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS calibration_result (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  decision_id TEXT NOT NULL REFERENCES decision(id),
  predicted_value INTEGER NOT NULL,
  outcome INTEGER NOT NULL,
  bucket INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_schedule (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  type TEXT NOT NULL,
  trigger_spec TEXT NOT NULL,
  local_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sync_meta (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  last_pulled_at INTEGER,
  last_pushed_at INTEGER
);

CREATE TABLE IF NOT EXISTS webhook_event_log (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER,
  user_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS setting (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

export async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(INITIAL_SQL);
}
