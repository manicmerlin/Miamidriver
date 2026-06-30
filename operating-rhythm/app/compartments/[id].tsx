import React, { useCallback, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Row } from '@/components/Row';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Stamp } from '@/components/Stamp';
import { Rule } from '@/components/Rule';
import { ExitModal } from '@/components/ExitModal';
import { useTheme } from '@/theme/ThemeProvider';
import {
  getCompartment,
  listItems,
  ACTIVE_CAP,
  createItem,
  promoteToActive,
  exitItem,
  setCompartmentBoundary,
  updateCompartment,
} from '@/db/repos';
import type { Compartment, Item } from '@/db/schema';

export default function CompartmentDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<Compartment | null>(null);
  const [active, setActive] = useState<Item[]>([]);
  const [someday, setSomeday] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [editSop, setEditSop] = useState(false);
  const [sopDraft, setSopDraft] = useState({ normal: '', minimum: '', keystone: '' });

  const load = useCallback(async () => {
    if (!id) return;
    const cc = await getCompartment(id);
    if (cc) {
      setC(cc);
      setSopDraft({
        normal: cc.sop_normal ?? '',
        minimum: cc.sop_minimum ?? '',
        keystone: cc.sop_keystone ?? '',
      });
    }
    setActive(await listItems(id, 'active'));
    setSomeday(await listItems(id, 'someday'));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!c) {
    return (
      <Screen><Text>Loading…</Text></Screen>
    );
  }

  const addActive = async () => {
    const title = draft.trim();
    if (!title) return;
    if (active.length >= ACTIVE_CAP) {
      Alert.alert(
        'Active File is full.',
        `The Active File caps at ${ACTIVE_CAP}. Complete, file to Someday, or discard an existing item first.`,
      );
      return;
    }
    const itemId = await createItem({
      title,
      compartment_id: c.id,
      state: 'parked',
      source: 'app',
    });
    await promoteToActive(itemId, c.id);
    setDraft('');
    load();
  };

  const exiting = exitingId ? active.find((i) => i.id === exitingId) : null;

  const saveSop = async () => {
    await updateCompartment(c.id, {
      sop_normal: sopDraft.normal || null,
      sop_minimum: sopDraft.minimum || null,
      sop_keystone: sopDraft.keystone || null,
    });
    setEditSop(false);
    load();
  };

  return (
    <Screen>
      <Row justify="space-between">
        <View>
          <Stamp label={c.review_cycle.toUpperCase()} />
          <Text v="heading">{c.name}</Text>
          <Text v="caption" tone={c.open_boundary ? 'accent' : 'muted'}>
            {c.open_boundary ? 'Open · nothing else is your job right now' : 'Closed'}
          </Text>
        </View>
        <Button
          label={c.open_boundary ? 'Close compartment' : 'Enter compartment'}
          tone={c.open_boundary ? 'ghost' : 'primary'}
          onPress={async () => { await setCompartmentBoundary(c.id, !c.open_boundary); load(); }}
        />
      </Row>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Row justify="space-between">
            <Text v="title">Active File</Text>
            <Text v="mono" tone={active.length >= ACTIVE_CAP ? 'amber' : 'muted'}>{active.length}/{ACTIVE_CAP}</Text>
          </Row>
          <Rule />
          {active.length === 0 ? (
            <Text v="caption" tone="muted">Empty. Add only what's genuinely in motion.</Text>
          ) : active.map((it) => (
            <Pressable key={it.id} onPress={() => setExitingId(it.id)}>
              <Row justify="space-between" style={{ paddingVertical: t.space.xs }}>
                <Text v="body" style={{ flex: 1 }}>{it.title}</Text>
                <Text v="label" tone="muted">exit →</Text>
              </Row>
            </Pressable>
          ))}
          <Rule />
          <Row gap={t.space.sm}>
            <View style={{ flex: 1 }}>
              <Field value={draft} onChangeText={setDraft} placeholder="New active item" />
            </View>
            <Button label="Add" onPress={addActive} disabled={!draft.trim()} />
          </Row>
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Someday File</Text>
          <Rule />
          {someday.length === 0 ? (
            <Text v="caption" tone="muted">Filed, not forgotten. Items live here when they're not in motion.</Text>
          ) : someday.map((it) => (
            <Row key={it.id} justify="space-between" style={{ paddingVertical: t.space.xs }}>
              <Text v="caption" tone="secondary" style={{ flex: 1 }}>{it.title}</Text>
              <Pressable onPress={async () => {
                const r = await promoteToActive(it.id, c.id);
                if (!r.ok) Alert.alert('Active File is full.', 'Exit an active item first.');
                load();
              }}>
                <Text v="label" tone="accent">activate →</Text>
              </Pressable>
            </Row>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Row justify="space-between">
            <Text v="title">Designed Defaults</Text>
            <Pressable onPress={() => setEditSop(!editSop)}>
              <Text v="caption" tone="accent">{editSop ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          </Row>
          <Rule />
          {editSop ? (
            <View style={{ gap: t.space.sm }}>
              <Field
                label="Normal week"
                value={sopDraft.normal}
                onChangeText={(v) => setSopDraft({ ...sopDraft, normal: v })}
                multiline
              />
              <Field
                label="Non-negotiable minimum"
                value={sopDraft.minimum}
                onChangeText={(v) => setSopDraft({ ...sopDraft, minimum: v })}
                multiline
              />
              <Field
                label="Keystone behavior"
                value={sopDraft.keystone}
                onChangeText={(v) => setSopDraft({ ...sopDraft, keystone: v })}
              />
              <Button label="Save SOP" onPress={saveSop} />
            </View>
          ) : (
            <View style={{ gap: t.space.xs }}>
              <Text v="label" tone="muted">Normal week</Text>
              <Text v="body">{c.sop_normal ?? '—'}</Text>
              <Text v="label" tone="muted">Minimum</Text>
              <Text v="body">{c.sop_minimum ?? '—'}</Text>
              <Text v="label" tone="muted">Keystone</Text>
              <Text v="body" tone="accent">{c.sop_keystone ?? '—'}</Text>
              <Text v="caption" tone="muted">
                Last reviewed: {c.defaults_reviewed_at ? new Date(c.defaults_reviewed_at).toISOString().slice(0, 10) : 'never'}
              </Text>
            </View>
          )}
        </View>
      </Card>

      <ExitModal
        visible={!!exitingId}
        itemTitle={exiting?.title ?? ''}
        onClose={() => setExitingId(null)}
        onExit={async (exit, reason) => {
          if (!exitingId) return;
          await exitItem(exitingId, exit, reason);
          setExitingId(null);
          load();
        }}
      />
    </Screen>
  );
}
