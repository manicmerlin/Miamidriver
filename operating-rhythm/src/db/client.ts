import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { migrate } from './migrate';

const sqlite = SQLite.openDatabaseSync('operating-rhythm.db', {
  enableChangeListener: true,
});

export const db = drizzle(sqlite);

let migrated = false;
export async function ensureDb() {
  if (migrated) return;
  await migrate(sqlite);
  migrated = true;
}

export { sqlite };
