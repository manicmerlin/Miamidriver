import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Row } from '@/components/Row';
import { Stamp } from '@/components/Stamp';
import { Rule } from '@/components/Rule';
import { useTheme } from '@/theme/ThemeProvider';
import { listCompartments, listItems, ACTIVE_CAP, listParkedAll } from '@/db/repos';
import type { Compartment } from '@/db/schema';

type Row = { c: Compartment; activeCount: number; lastStatus?: string };

export default function CompartmentsList() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [parked, setParked] = useState(0);

  const load = useCallback(async () => {
    const cs = await listCompartments();
    const next: Row[] = [];
    for (const c of cs) {
      const active = await listItems(c.id, 'active');
      next.push({ c, activeCount: active.length });
    }
    setRows(next);
    setParked((await listParkedAll()).length);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <View style={{ gap: t.space.xs }}>
        <Stamp label="Compartments" />
        <Text v="heading">Spans of attention.</Text>
        <Text v="caption" tone="muted">5–8 is the guardrail. {rows.length} active.</Text>
      </View>

      {parked > 0 ? (
        <Card raised>
          <Row justify="space-between">
            <Text v="bodyMd">{parked} parked thought{parked === 1 ? '' : 's'} await categorization.</Text>
            <Stamp tone="amber" label="Triage" />
          </Row>
        </Card>
      ) : null}

      {rows.map(({ c, activeCount }) => (
        <Pressable key={c.id} onPress={() => router.push(`/compartments/${c.id}`)}>
          <Card>
            <View style={{ gap: t.space.xs }}>
              <Row justify="space-between">
                <Text v="title">{c.name}</Text>
                <Text v="mono" tone={activeCount >= ACTIVE_CAP ? 'amber' : 'muted'}>
                  {activeCount}/{ACTIVE_CAP}
                </Text>
              </Row>
              {c.sop_keystone ? (
                <Text v="caption" tone="secondary">Keystone — {c.sop_keystone}</Text>
              ) : (
                <Text v="caption" tone="muted">No keystone behavior set.</Text>
              )}
              <Rule />
              <Text v="label" tone="muted">{c.review_cycle.toUpperCase()} · order #{c.order_index + 1}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
