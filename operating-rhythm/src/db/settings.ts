import { eq } from 'drizzle-orm';
import { db } from './client';
import { setting } from './schema';
import { now } from './ids';

export const SettingKey = {
  ONBOARDED: 'onboarded',                       // 'true' once onboarding completes
  WEEKLY_BRIEFING_DAY: 'weekly_briefing_day',    // 0–6, 0 = Sunday
  WEEKLY_BRIEFING_HOUR: 'weekly_briefing_hour',  // 0–23
  WEEKLY_BRIEFING_MINUTE: 'weekly_briefing_minute',
  DAILY_ORDERS_HOUR: 'daily_orders_hour',
  DAILY_ORDERS_MINUTE: 'daily_orders_minute',
  DEFAULTS_MONTHS: 'defaults_months',            // CSV, e.g. "1,7"
  N8N_WEBHOOK_BASE: 'n8n_webhook_base',
  N8N_WEBHOOK_TOKEN: 'n8n_webhook_token',
  CALIBRATION_SCALE: 'calibration_scale',        // 'kent' | 'icd203'
  COMPARTMENT_ORDER: 'compartment_order',        // CSV of compartment ids for briefing order
} as const;

export type SettingKey = typeof SettingKey[keyof typeof SettingKey];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const rows = await db.select().from(setting).where(eq(setting.key, key));
  return rows[0]?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string | null) {
  const existing = await db.select().from(setting).where(eq(setting.key, key));
  if (existing.length) {
    await db
      .update(setting)
      .set({ value, updated_at: now() })
      .where(eq(setting.key, key));
  } else {
    await db.insert(setting).values({ key, value, updated_at: now() });
  }
}

export async function getSettings<K extends SettingKey>(keys: readonly K[]) {
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = await getSetting(k);
  return out as Record<K, string | null>;
}
