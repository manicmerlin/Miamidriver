import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Row } from '@/components/Row';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Stamp } from '@/components/Stamp';
import { Rule } from '@/components/Rule';
import { useTheme } from '@/theme/ThemeProvider';
import {
  getSettings,
  setSetting,
  SettingKey,
} from '@/db/settings';
import { rebuildAllSchedules, listScheduledSummary } from '@/lib/notifications';
import { flushOutbox, pullRemoteCaptures } from '@/lib/webhook';

export default function Settings() {
  const t = useTheme();
  const [s, setS] = useState({
    wDay: '0', wHour: '8', wMin: '0',
    dHour: '7', dMin: '0',
    months: '1,7',
    base: '', token: '',
    scale: 'icd203',
  });
  const [scheduled, setScheduled] = useState<{ type: string; trigger_spec: string }[]>([]);

  const load = useCallback(async () => {
    const out = await getSettings([
      SettingKey.WEEKLY_BRIEFING_DAY,
      SettingKey.WEEKLY_BRIEFING_HOUR,
      SettingKey.WEEKLY_BRIEFING_MINUTE,
      SettingKey.DAILY_ORDERS_HOUR,
      SettingKey.DAILY_ORDERS_MINUTE,
      SettingKey.DEFAULTS_MONTHS,
      SettingKey.N8N_WEBHOOK_BASE,
      SettingKey.N8N_WEBHOOK_TOKEN,
      SettingKey.CALIBRATION_SCALE,
    ]);
    setS({
      wDay: out[SettingKey.WEEKLY_BRIEFING_DAY] ?? '0',
      wHour: out[SettingKey.WEEKLY_BRIEFING_HOUR] ?? '8',
      wMin: out[SettingKey.WEEKLY_BRIEFING_MINUTE] ?? '0',
      dHour: out[SettingKey.DAILY_ORDERS_HOUR] ?? '7',
      dMin: out[SettingKey.DAILY_ORDERS_MINUTE] ?? '0',
      months: out[SettingKey.DEFAULTS_MONTHS] ?? '1,7',
      base: out[SettingKey.N8N_WEBHOOK_BASE] ?? '',
      token: out[SettingKey.N8N_WEBHOOK_TOKEN] ?? '',
      scale: out[SettingKey.CALIBRATION_SCALE] ?? 'icd203',
    });
    setScheduled((await listScheduledSummary()).map((n) => ({ type: n.type, trigger_spec: n.trigger_spec })));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveCadence = async () => {
    await setSetting(SettingKey.WEEKLY_BRIEFING_DAY, s.wDay);
    await setSetting(SettingKey.WEEKLY_BRIEFING_HOUR, s.wHour);
    await setSetting(SettingKey.WEEKLY_BRIEFING_MINUTE, s.wMin);
    await setSetting(SettingKey.DAILY_ORDERS_HOUR, s.dHour);
    await setSetting(SettingKey.DAILY_ORDERS_MINUTE, s.dMin);
    await setSetting(SettingKey.DEFAULTS_MONTHS, s.months);
    await rebuildAllSchedules();
    load();
    Alert.alert('Saved', 'Notifications rescheduled.');
  };

  const saveIntegration = async () => {
    await setSetting(SettingKey.N8N_WEBHOOK_BASE, s.base.trim());
    await setSetting(SettingKey.N8N_WEBHOOK_TOKEN, s.token.trim());
    Alert.alert('Saved', 'n8n connection updated.');
  };

  const flush = async () => {
    const r = await flushOutbox();
    Alert.alert('Outbox', `Delivered ${r.delivered}, failed ${r.failed}.`);
  };

  const pull = async () => {
    const r = await pullRemoteCaptures();
    Alert.alert('Pulled', `${r.pulled} remote-captured items.`);
  };

  return (
    <Screen>
      <Stamp label="Settings" />

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Cadence</Text>
          <Rule />
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}><Field label="Weekly day (0=Sun)" value={s.wDay} onChangeText={(v) => setS({ ...s, wDay: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Weekly hour" value={s.wHour} onChangeText={(v) => setS({ ...s, wHour: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Weekly min" value={s.wMin} onChangeText={(v) => setS({ ...s, wMin: v })} keyboardType="number-pad" /></View>
          </Row>
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}><Field label="Daily hour" value={s.dHour} onChangeText={(v) => setS({ ...s, dHour: v })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Daily min" value={s.dMin} onChangeText={(v) => setS({ ...s, dMin: v })} keyboardType="number-pad" /></View>
          </Row>
          <Field label="Defaults review months (CSV 1–12)" value={s.months} onChangeText={(v) => setS({ ...s, months: v })} />
          <Button label="Save & reschedule" onPress={saveCadence} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">n8n integration</Text>
          <Rule />
          <Field label="Webhook base" value={s.base} onChangeText={(v) => setS({ ...s, base: v })} placeholder="https://n8n.home.example/webhook" autoCapitalize="none" />
          <Field label="Bearer token" value={s.token} onChangeText={(v) => setS({ ...s, token: v })} placeholder="shared secret" autoCapitalize="none" secureTextEntry />
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}><Button label="Save" onPress={saveIntegration} /></View>
            <View style={{ flex: 1 }}><Button label="Flush outbox" tone="ghost" onPress={flush} /></View>
            <View style={{ flex: 1 }}><Button label="Pull inbound" tone="ghost" onPress={pull} /></View>
          </Row>
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Calibration scale (Phase 2)</Text>
          <Rule />
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label="ICD 203 (7 tiers)"
                tone={s.scale === 'icd203' ? 'primary' : 'ghost'}
                onPress={async () => { setS({ ...s, scale: 'icd203' }); await setSetting(SettingKey.CALIBRATION_SCALE, 'icd203'); }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Kent (1964)"
                tone={s.scale === 'kent' ? 'primary' : 'ghost'}
                onPress={async () => { setS({ ...s, scale: 'kent' }); await setSetting(SettingKey.CALIBRATION_SCALE, 'kent'); }}
              />
            </View>
          </Row>
          <Text v="caption" tone="muted">
            Likelihood and confidence are stored as separate fields and must not
            be combined in the same phrase (ICD 203).
          </Text>
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Scheduled notifications</Text>
          <Rule />
          {scheduled.length === 0 ? (
            <Text v="caption" tone="muted">None scheduled.</Text>
          ) : scheduled.map((n, i) => (
            <Text key={i} v="mono" tone="secondary">{n.type} — {n.trigger_spec}</Text>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
