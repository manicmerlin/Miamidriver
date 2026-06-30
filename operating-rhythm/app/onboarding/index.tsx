import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Rule } from '@/components/Rule';
import { Stamp } from '@/components/Stamp';
import { Row } from '@/components/Row';
import { useTheme } from '@/theme/ThemeProvider';
import { useOnboarding } from '@/stores/onboarding';
import { STARTER_COMPARTMENTS, ensureStarterCompartments } from '@/db/seed';
import { listCompartments, updateCompartment, promoteToActive, createItem } from '@/db/repos';
import { newId } from '@/db/ids';
import { setSetting, SettingKey } from '@/db/settings';
import { rebuildAllSchedules, ensurePermissions } from '@/lib/notifications';

const STARTER_NAMES = STARTER_COMPARTMENTS.map((c) => c.name);

export default function OnboardingScreen() {
  const { step, setStep } = useOnboarding();
  switch (step) {
    case 'welcome':       return <Welcome onNext={() => setStep('compartments')} />;
    case 'compartments':  return <CompartmentPick onNext={() => setStep('sops')} />;
    case 'sops':          return <SopPrompts onNext={() => setStep('active')} />;
    case 'active':        return <SeedActive onNext={() => setStep('rhythm')} />;
    case 'rhythm':        return <SetRhythm onNext={() => setStep('connections')} />;
    case 'connections':   return <Connections onNext={() => setStep('first_briefing')} />;
    case 'first_briefing':return <FirstBriefing />;
  }
}

function Welcome({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between', gap: t.space.xl }}>
        <View style={{ gap: t.space.base }}>
          <Stamp label="Operating Rhythm" />
          <Text v="display">Run your life like an account.</Text>
          <Text v="serif" tone="secondary">
            Clean compartments. Honest status. A steady rhythm.
          </Text>
          <Rule tone="brass" style={{ marginTop: t.space.base }} />
          <Text v="body" tone="secondary">
            You are the analyst — and the case officer — of your own life. The app's job is to
            enforce a cadence of attention, not to store an infinite to-do list.
          </Text>
        </View>
        <Button label="Begin setup" onPress={onNext} />
      </View>
    </Screen>
  );
}

function CompartmentPick({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const { picks, setPicks } = useOnboarding();
  const [custom, setCustom] = useState('');
  const [extras, setExtras] = useState<string[]>([]);
  const all = [...STARTER_NAMES, ...extras];

  const toggle = (name: string) => {
    setPicks(picks.includes(name) ? picks.filter((n) => n !== name) : [...picks, name]);
  };

  const inRange = picks.length >= 5 && picks.length <= 8;

  return (
    <Screen>
      <View style={{ gap: t.space.sm }}>
        <Stamp label="Step 1 of 6" />
        <Text v="heading">Pick your compartments.</Text>
        <Text v="caption" tone="muted">
          Choose 5–8 domains. Each gets its own information space and review cycle.
        </Text>
      </View>
      <Card>
        <View style={{ gap: t.space.sm }}>
          {all.map((name) => {
            const on = picks.includes(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggle(name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: t.space.sm,
                }}
              >
                <Text v="bodyMd">{name}</Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: on ? t.colors.accent : t.colors.rule,
                    backgroundColor: on ? t.colors.accent : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card>
        <View style={{ gap: t.space.sm }}>
          <Field
            label="Add a custom compartment"
            placeholder="e.g. Side project"
            value={custom}
            onChangeText={setCustom}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (custom.trim()) {
                setExtras([...extras, custom.trim()]);
                setPicks([...picks, custom.trim()]);
                setCustom('');
              }
            }}
          />
        </View>
      </Card>
      <Row justify="space-between">
        <Text v="mono" tone="muted">{picks.length}/8 selected</Text>
        <Button label="Next" onPress={onNext} disabled={!inRange} />
      </Row>
    </Screen>
  );
}

function SopPrompts({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const { picks } = useOnboarding();
  const [sops, setSops] = useState<Record<string, { normal: string; minimum: string; keystone: string }>>({});
  const [seeded, setSeeded] = useState(false);

  React.useEffect(() => {
    (async () => {
      const seedList = picks.map((name) => {
        const fromStarter = STARTER_COMPARTMENTS.find((s) => s.name === name);
        return { name, sop_keystone: fromStarter?.sop_keystone ?? null };
      });
      await ensureStarterCompartments(seedList);
      setSeeded(true);
    })();
  }, []);

  if (!seeded) return <Screen><Text>…</Text></Screen>;

  const next = async () => {
    const all = await listCompartments();
    for (const c of all) {
      const s = sops[c.name];
      if (!s) continue;
      await updateCompartment(c.id, {
        sop_normal: s.normal || null,
        sop_minimum: s.minimum || null,
        sop_keystone: s.keystone || c.sop_keystone,
      });
    }
    onNext();
  };

  return (
    <Screen>
      <View style={{ gap: t.space.sm }}>
        <Stamp label="Step 2 of 6 — Designed Defaults" />
        <Text v="heading">Per-compartment SOP.</Text>
        <Text v="caption" tone="muted">
          Skippable. You can fill these in later from each compartment's screen.
        </Text>
      </View>
      {picks.map((name) => {
        const sop = sops[name] ?? { normal: '', minimum: '', keystone: '' };
        const update = (patch: Partial<typeof sop>) => setSops({ ...sops, [name]: { ...sop, ...patch } });
        return (
          <Card key={name}>
            <View style={{ gap: t.space.sm }}>
              <Text v="title">{name}</Text>
              <Field
                label="Normal week"
                value={sop.normal}
                onChangeText={(v) => update({ normal: v })}
                placeholder="What should run on a normal week?"
                multiline
              />
              <Field
                label="Non-negotiable minimum"
                value={sop.minimum}
                onChangeText={(v) => update({ minimum: v })}
                placeholder="The floor below which this domain degrades."
                multiline
              />
              <Field
                label="Keystone behavior"
                value={sop.keystone}
                onChangeText={(v) => update({ keystone: v })}
                placeholder="The single behavior that holds this domain together."
              />
            </View>
          </Card>
        );
      })}
      <Button label="Next" onPress={next} />
    </Screen>
  );
}

function SeedActive({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const [list, setList] = useState<{ id: string; name: string }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});

  React.useEffect(() => { (async () => setList(await listCompartments()))(); }, []);

  const submit = async () => {
    for (const c of list) {
      const items = (drafts[c.id] ?? []).map((t) => t.trim()).filter(Boolean);
      for (const title of items) {
        const id = await createItem({
          title,
          compartment_id: c.id,
          state: 'parked',
          source: 'app',
        });
        await promoteToActive(id, c.id);
      }
    }
    onNext();
  };

  return (
    <Screen>
      <Stamp label="Step 3 of 6 — Active File" />
      <Text v="heading">What's genuinely in motion?</Text>
      <Text v="caption" tone="muted">
        Cap is 3–7 per compartment. List only what's actually moving in the next ~30 days.
      </Text>
      {list.map((c) => {
        const drafted = drafts[c.id] ?? [''];
        return (
          <Card key={c.id}>
            <View style={{ gap: t.space.sm }}>
              <Text v="title">{c.name}</Text>
              {drafted.map((value, idx) => (
                <Field
                  key={idx}
                  value={value}
                  onChangeText={(v) => {
                    const next = [...drafted];
                    next[idx] = v;
                    setDrafts({ ...drafts, [c.id]: next });
                  }}
                  placeholder={`Item ${idx + 1}`}
                />
              ))}
              {drafted.length < 7 ? (
                <Pressable onPress={() => setDrafts({ ...drafts, [c.id]: [...drafted, ''] })}>
                  <Text v="caption" tone="accent">+ Add another</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        );
      })}
      <Button label="Next" onPress={submit} />
    </Screen>
  );
}

function SetRhythm({ onNext }: { onNext: () => void }) {
  const t = useTheme();
  const [wDay, setWDay] = useState('0'); // Sunday
  const [wHour, setWHour] = useState('8');
  const [wMin, setWMin] = useState('0');
  const [dHour, setDHour] = useState('7');
  const [dMin, setDMin] = useState('0');
  const [months, setMonths] = useState('1,7');

  const submit = async () => {
    await setSetting(SettingKey.WEEKLY_BRIEFING_DAY, wDay);
    await setSetting(SettingKey.WEEKLY_BRIEFING_HOUR, wHour);
    await setSetting(SettingKey.WEEKLY_BRIEFING_MINUTE, wMin);
    await setSetting(SettingKey.DAILY_ORDERS_HOUR, dHour);
    await setSetting(SettingKey.DAILY_ORDERS_MINUTE, dMin);
    await setSetting(SettingKey.DEFAULTS_MONTHS, months);
    await ensurePermissions();
    await rebuildAllSchedules();
    onNext();
  };

  return (
    <Screen>
      <Stamp label="Step 4 of 6 — Cadence" />
      <Text v="heading">Set the rhythm.</Text>
      <Text v="caption" tone="muted">
        Weekly briefing, daily orders, semiannual defaults review. Notifications schedule now.
      </Text>
      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Weekly briefing</Text>
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}><Field label="Day (0=Sun)" value={wDay} onChangeText={setWDay} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Hour" value={wHour} onChangeText={setWHour} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Min" value={wMin} onChangeText={setWMin} keyboardType="number-pad" /></View>
          </Row>
        </View>
      </Card>
      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Daily orders</Text>
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}><Field label="Hour" value={dHour} onChangeText={setDHour} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Min" value={dMin} onChangeText={setDMin} keyboardType="number-pad" /></View>
          </Row>
        </View>
      </Card>
      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Designed Defaults review</Text>
          <Field label="Months (CSV, 1–12)" value={months} onChangeText={setMonths} />
        </View>
      </Card>
      <Button label="Save & schedule" onPress={submit} />
    </Screen>
  );
}

function Connections({ onNext }: { onNext: () => void }) {
  const [base, setBase] = useState('');
  const [token, setToken] = useState('');
  const t = useTheme();
  const save = async () => {
    if (base.trim()) await setSetting(SettingKey.N8N_WEBHOOK_BASE, base.trim());
    if (token.trim()) await setSetting(SettingKey.N8N_WEBHOOK_TOKEN, token.trim());
    onNext();
  };
  return (
    <Screen>
      <Stamp label="Step 5 of 6 — Optional connections" />
      <Text v="heading">n8n & Telegram (optional).</Text>
      <Text v="caption" tone="muted">
        Set later from Settings. The Postgres service key never lives in this app.
      </Text>
      <Card>
        <View style={{ gap: t.space.sm }}>
          <Field label="n8n webhook base" placeholder="https://n8n.home.example/webhook" value={base} onChangeText={setBase} autoCapitalize="none" />
          <Field label="Bearer token" placeholder="shared secret" value={token} onChangeText={setToken} autoCapitalize="none" secureTextEntry />
        </View>
      </Card>
      <Row gap={t.space.sm}>
        <View style={{ flex: 1 }}><Button label="Skip" tone="ghost" onPress={onNext} /></View>
        <View style={{ flex: 1 }}><Button label="Save" onPress={save} /></View>
      </Row>
    </Screen>
  );
}

function FirstBriefing() {
  const router = useRouter();
  const finish = async () => {
    await setSetting(SettingKey.ONBOARDED, 'true');
    router.replace('/');
  };
  const startBriefing = async () => {
    await setSetting(SettingKey.ONBOARDED, 'true');
    router.replace('/briefing');
  };
  return (
    <Screen>
      <Stamp label="Step 6 of 6" />
      <Text v="heading">Run your first weekly briefing now?</Text>
      <Text v="body" tone="secondary">
        Or do it later from the home screen.
      </Text>
      <Button label="Start first briefing" onPress={startBriefing} />
      <Button label="Take me home" tone="ghost" onPress={finish} />
    </Screen>
  );
}
