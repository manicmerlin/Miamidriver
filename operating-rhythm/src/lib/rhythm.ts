import { getSetting, SettingKey } from '../db/settings';
import { listCompartments, latestBriefing } from '../db/repos';

export function startOfWeek(d = new Date(), weekStartsOnSunday = true): Date {
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = weekStartsOnSunday ? day : (day + 6) % 7;
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - diff);
  return out;
}

export function startOfDay(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function nextDueRitual(): Promise<{
  ritual: 'weekly_briefing' | 'daily_orders' | 'defaults_review';
  due: Date;
  overdueDays: number;
}> {
  const now = new Date();

  const wDay = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_DAY)) ?? '0');
  const wHour = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_HOUR)) ?? '8');
  const wMin = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_MINUTE)) ?? '0');

  // next weekly
  const weekly = new Date(now);
  const dayDelta = (wDay - weekly.getDay() + 7) % 7;
  weekly.setDate(weekly.getDate() + dayDelta);
  weekly.setHours(wHour, wMin, 0, 0);
  if (weekly.getTime() <= now.getTime()) weekly.setDate(weekly.getDate() + 7);

  const last = await latestBriefing();
  const thisWeekStart = startOfWeek(now).getTime();
  const briefedThisWeek = last?.completed_at && last.week_start === thisWeekStart;

  if (!briefedThisWeek) {
    const overdueDays = Math.max(
      0,
      Math.floor((now.getTime() - thisWeekStart) / (1000 * 60 * 60 * 24)),
    );
    return { ritual: 'weekly_briefing', due: weekly, overdueDays };
  }

  const dHour = Number((await getSetting(SettingKey.DAILY_ORDERS_HOUR)) ?? '7');
  const dMin = Number((await getSetting(SettingKey.DAILY_ORDERS_MINUTE)) ?? '0');
  const today = new Date(now);
  today.setHours(dHour, dMin, 0, 0);
  if (today.getTime() <= now.getTime()) today.setDate(today.getDate() + 1);
  return { ritual: 'daily_orders', due: today, overdueDays: 0 };
}

export async function compartmentSpanGuardrail(): Promise<'ok' | 'too_few' | 'too_many'> {
  const cs = await listCompartments();
  if (cs.length < 3) return 'too_few';
  if (cs.length > 8) return 'too_many';
  return 'ok';
}
