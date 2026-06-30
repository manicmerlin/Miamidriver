import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  upsertNotificationSchedule,
  listSchedules,
} from '../db/repos';
import { getSetting, SettingKey } from '../db/settings';

// iOS foreground display + Android channels are required, or scheduled
// notifications silently no-op (spec §5.4, §8).
export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Operating Rhythm',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      vibrationPattern: [0, 120],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync('rhythm', {
      name: 'Rhythm reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function ensurePermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (!existing.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: false,
      allowAnnouncements: false,
    },
  });
  return req.status === 'granted';
}

async function cancelAllScheduled() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

type DailyTriggerSpec = { hour: number; minute: number };
type WeeklyTriggerSpec = { weekday: number; hour: number; minute: number };
type MonthlyTriggerSpec = { months: number[]; day: number; hour: number; minute: number };

async function scheduleDaily(spec: DailyTriggerSpec) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily orders',
      body: 'Observe yesterday. Set today’s 1–3 orders.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: spec.hour,
      minute: spec.minute,
    },
  });
}

async function scheduleWeekly(spec: WeeklyTriggerSpec) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly briefing',
      body: 'Walk the compartments. Honest status. Set the week’s moves.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: spec.weekday + 1, // expo: 1=Sunday … 7=Saturday
      hour: spec.hour,
      minute: spec.minute,
    },
  });
}

async function scheduleDefaultsReview(spec: MonthlyTriggerSpec) {
  // expo-notifications doesn't expose a multi-month cron, so we manually
  // compute the next firing date per month and schedule one-shot DATE
  // triggers. Re-runs on every reschedule call so the next two are always
  // in the queue.
  const now = new Date();
  const ids: string[] = [];
  for (const m of spec.months) {
    const candidate = new Date(now.getFullYear(), m - 1, spec.day, spec.hour, spec.minute, 0);
    if (candidate.getTime() <= now.getTime()) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Designed Defaults review',
        body: 'Twice-yearly SOP review — walk each compartment’s SOP.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: candidate,
      },
    });
    ids.push(id);
  }
  return ids.join(',');
}

export async function rebuildAllSchedules() {
  const ok = await ensurePermissions();
  if (!ok) return;
  await cancelAllScheduled();

  const hour = Number((await getSetting(SettingKey.DAILY_ORDERS_HOUR)) ?? '7');
  const minute = Number((await getSetting(SettingKey.DAILY_ORDERS_MINUTE)) ?? '0');
  const dailyId = await scheduleDaily({ hour, minute });
  await upsertNotificationSchedule({
    type: 'daily_orders',
    trigger_spec: JSON.stringify({ hour, minute }),
    local_id: dailyId,
    enabled: true,
  });

  const wHour = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_HOUR)) ?? '8');
  const wMinute = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_MINUTE)) ?? '0');
  const wDay = Number((await getSetting(SettingKey.WEEKLY_BRIEFING_DAY)) ?? '0'); // Sunday default
  const weeklyId = await scheduleWeekly({ weekday: wDay, hour: wHour, minute: wMinute });
  await upsertNotificationSchedule({
    type: 'weekly_briefing',
    trigger_spec: JSON.stringify({ weekday: wDay, hour: wHour, minute: wMinute }),
    local_id: weeklyId,
    enabled: true,
  });

  const monthsCsv = (await getSetting(SettingKey.DEFAULTS_MONTHS)) ?? '1,7';
  const months = monthsCsv.split(',').map(Number).filter((n) => n >= 1 && n <= 12);
  const dId = await scheduleDefaultsReview({ months, day: 1, hour: 9, minute: 0 });
  await upsertNotificationSchedule({
    type: 'defaults_review',
    trigger_spec: JSON.stringify({ months, day: 1, hour: 9, minute: 0 }),
    local_id: dId,
    enabled: true,
  });
}

export async function listScheduledSummary() {
  return listSchedules();
}
