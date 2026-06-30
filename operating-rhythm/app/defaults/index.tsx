import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Row } from '@/components/Row';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Stamp } from '@/components/Stamp';
import { Rule } from '@/components/Rule';
import { useTheme } from '@/theme/ThemeProvider';
import { listCompartments, updateCompartment } from '@/db/repos';
import type { Compartment } from '@/db/schema';

type Draft = { normal: string; minimum: string; keystone: string };

export default function DefaultsReview() {
  const t = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Compartment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const load = useCallback(async () => {
    const cs = await listCompartments();
    setList(cs);
    const seed: Record<string, Draft> = {};
    for (const c of cs) {
      seed[c.id] = {
        normal: c.sop_normal ?? '',
        minimum: c.sop_minimum ?? '',
        keystone: c.sop_keystone ?? '',
      };
    }
    setDrafts(seed);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completeAll = async () => {
    const now = Date.now();
    for (const c of list) {
      const d = drafts[c.id];
      await updateCompartment(c.id, {
        sop_normal: d?.normal || null,
        sop_minimum: d?.minimum || null,
        sop_keystone: d?.keystone || null,
        defaults_reviewed_at: now,
      });
    }
    router.replace('/');
  };

  return (
    <Screen>
      <Stamp label="Twice-yearly · Designed Defaults" />
      <Text v="heading">Defaults Review</Text>
      <Text v="caption" tone="muted">
        Walk each compartment's SOP. Confirm or revise. Stamping marks today
        as the review date.
      </Text>

      {list.map((c) => {
        const d = drafts[c.id] ?? { normal: '', minimum: '', keystone: '' };
        const update = (patch: Partial<Draft>) =>
          setDrafts({ ...drafts, [c.id]: { ...d, ...patch } });
        return (
          <Card key={c.id}>
            <View style={{ gap: t.space.sm }}>
              <Row justify="space-between">
                <Text v="title">{c.name}</Text>
                <Text v="label" tone="muted">
                  Last: {c.defaults_reviewed_at ? new Date(c.defaults_reviewed_at).toISOString().slice(0, 10) : '—'}
                </Text>
              </Row>
              <Rule />
              <Field label="Normal week" value={d.normal} onChangeText={(v) => update({ normal: v })} multiline />
              <Field label="Non-negotiable minimum" value={d.minimum} onChangeText={(v) => update({ minimum: v })} multiline />
              <Field label="Keystone behavior" value={d.keystone} onChangeText={(v) => update({ keystone: v })} />
            </View>
          </Card>
        );
      })}

      <Button label="Stamp review complete" onPress={completeAll} />
    </Screen>
  );
}
