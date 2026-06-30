import React, { useEffect, useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
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
  listCompartments,
  createBriefing,
  saveCompartmentStatus,
  saveWeeklyMove,
  completeBriefing,
  statusesForBriefing,
  movesForBriefing,
} from '@/db/repos';
import type { Compartment } from '@/db/schema';
import { startOfWeek } from '@/lib/rhythm';
import { buildBluf } from '@/lib/bluf';
import { emit } from '@/lib/webhook';

const MAX_MOVES = 3;

type Draft = {
  status: string;
  honesty: boolean;
  observed: string;
  interpreted: string;
  moves: string[];
};

export default function BriefingFlow() {
  const t = useTheme();
  const router = useRouter();
  const [compartments, setCompartments] = useState<Compartment[]>([]);
  const [idx, setIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [startedAt] = useState(Date.now());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => { (async () => {
    setCompartments(await listCompartments());
    setBriefingId(await createBriefing(startOfWeek().getTime()));
  })(); }, []);

  if (!briefingId || compartments.length === 0) {
    return <Screen><Text>Preparing briefing…</Text></Screen>;
  }

  const c = compartments[idx]!;
  const draft = drafts[c.id] ?? {
    status: '',
    honesty: false,
    observed: '',
    interpreted: '',
    moves: [''],
  };
  const update = (patch: Partial<Draft>) =>
    setDrafts({ ...drafts, [c.id]: { ...draft, ...patch } });

  const last = idx === compartments.length - 1;

  const proceed = async () => {
    if (!draft.status.trim()) {
      Alert.alert(
        'Status required.',
        'The honest one-line status is mandatory. What actually happened this past week?',
      );
      return;
    }
    if (!savedIds.has(c.id)) {
      await saveCompartmentStatus({
        briefing_id: briefingId,
        compartment_id: c.id,
        status_line: draft.status.trim(),
        observed: draft.honesty ? draft.observed.trim() || null : null,
        interpreted: draft.honesty ? draft.interpreted.trim() || null : null,
        honesty_checked: draft.honesty,
      });
      const movesClean = draft.moves.map((m) => m.trim()).filter(Boolean).slice(0, MAX_MOVES);
      for (const m of movesClean) {
        await saveWeeklyMove({
          briefing_id: briefingId,
          compartment_id: c.id,
          title: m,
        });
      }
      setSavedIds(new Set(savedIds).add(c.id));
    }
    if (last) {
      const statuses = await statusesForBriefing(briefingId);
      const moves = await movesForBriefing(briefingId);
      const bluf = buildBluf({
        weekStart: startOfWeek().getTime(),
        compartments,
        statuses,
        moves,
      });
      const duration = Math.round((Date.now() - startedAt) / 1000);
      await completeBriefing(briefingId, bluf, duration);
      void emit('briefing.completed', { bluf, compartments_covered: statuses.length, moves: moves.length });
      router.replace({ pathname: '/briefing/result', params: { id: briefingId } });
    } else {
      setIdx(idx + 1);
    }
  };

  const back = () => { if (idx > 0) setIdx(idx - 1); };

  return (
    <Screen>
      <View style={{ gap: t.space.xs }}>
        <Stamp label={`Compartment ${idx + 1} of ${compartments.length}`} />
        <Text v="heading">{c.name}</Text>
        {c.sop_keystone ? <Text v="caption" tone="accent">Keystone — {c.sop_keystone}</Text> : null}
        {c.sop_minimum ? <Text v="caption" tone="muted">Minimum — {c.sop_minimum}</Text> : null}
      </View>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="label" tone="muted">Honest status (required)</Text>
          <Field
            value={draft.status}
            onChangeText={(v) => update({ status: v })}
            placeholder="What actually happened this week? One line."
            multiline
          />
          <Pressable onPress={() => update({ honesty: !draft.honesty })}>
            <Row gap={t.space.sm}>
              <View
                style={{
                  width: 16, height: 16, borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: draft.honesty ? t.colors.accent : t.colors.rule,
                  backgroundColor: draft.honesty ? t.colors.accent : 'transparent',
                }}
              />
              <Text v="caption" tone="secondary">
                Honesty check: split into observation vs. interpretation
              </Text>
            </Row>
          </Pressable>
          {draft.honesty ? (
            <View style={{ gap: t.space.sm }}>
              <Field
                label="Observed (facts)"
                value={draft.observed}
                onChangeText={(v) => update({ observed: v })}
                placeholder="What you can point to."
                multiline
              />
              <Field
                label="Interpreted (your read)"
                value={draft.interpreted}
                onChangeText={(v) => update({ interpreted: v })}
                placeholder="What you think it means."
                multiline
              />
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Row justify="space-between">
            <Text v="title">Moves this week</Text>
            <Text v="mono" tone="muted">{draft.moves.filter(Boolean).length}/{MAX_MOVES}</Text>
          </Row>
          <Rule />
          {draft.moves.map((m, i) => (
            <Field
              key={i}
              value={m}
              onChangeText={(v) => {
                const next = [...draft.moves];
                next[i] = v;
                update({ moves: next });
              }}
              placeholder={`Move ${i + 1}`}
            />
          ))}
          {draft.moves.length < MAX_MOVES ? (
            <Pressable onPress={() => update({ moves: [...draft.moves, ''] })}>
              <Text v="caption" tone="accent">+ Add another move</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Row gap={t.space.sm}>
        <View style={{ flex: 1 }}>
          <Button label="Back" tone="ghost" onPress={back} disabled={idx === 0} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={last ? 'Generate BLUF' : 'Next compartment'} onPress={proceed} />
        </View>
      </Row>
    </Screen>
  );
}
