import React, { useCallback, useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  createDailyOrder,
  ordersForDate,
  listCompartments,
  listItems,
  movesForBriefing,
  latestBriefing,
  DAILY_ORDER_CAP,
} from '@/db/repos';
import { startOfDay } from '@/lib/rhythm';
import type { Item, WeeklyMove } from '@/db/schema';

type Candidate = { kind: 'item' | 'move'; id: string; title: string };

export default function OrdersScreen() {
  const t = useTheme();
  const router = useRouter();
  const [today] = useState(startOfDay().getTime());
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof ordersForDate>>>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setOrders(await ordersForDate(today));
    const cs = await listCompartments();
    const items: Item[] = [];
    for (const c of cs) items.push(...(await listItems(c.id, 'active')));
    const latest = await latestBriefing();
    const moves: WeeklyMove[] = latest ? await movesForBriefing(latest.id) : [];
    const list: Candidate[] = [
      ...moves.map<Candidate>((m) => ({ kind: 'move', id: m.id, title: m.title })),
      ...items.map<Candidate>((i) => ({ kind: 'item', id: i.id, title: i.title })),
    ];
    setCandidates(list);
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async (title: string, parent?: Candidate) => {
    if (orders.length >= DAILY_ORDER_CAP) {
      Alert.alert('Three is the cap.', 'A day has room for 3 orders, not more. Honor what you set.');
      return;
    }
    await createDailyOrder({
      date: today,
      title,
      parent_item_id: parent?.kind === 'item' ? parent.id : null,
      parent_move_id: parent?.kind === 'move' ? parent.id : null,
    });
    setDraft('');
    load();
  };

  return (
    <Screen>
      <View style={{ gap: t.space.xs }}>
        <Stamp label="OODA · today" />
        <Text v="heading">Today's orders</Text>
        <Text v="caption" tone="muted">
          Observe → Orient → Decide. Pick 1–3 things you will actually move today.
        </Text>
      </View>

      <Card raised>
        <View style={{ gap: t.space.sm }}>
          <Row justify="space-between">
            <Text v="title">Orders</Text>
            <Text v="mono" tone={orders.length >= DAILY_ORDER_CAP ? 'amber' : 'muted'}>
              {orders.length}/{DAILY_ORDER_CAP}
            </Text>
          </Row>
          <Rule />
          {orders.length === 0 ? (
            <Text v="caption" tone="muted">Nothing set yet.</Text>
          ) : orders.map((o) => (
            <Text key={o.id} v="body">• {o.title}</Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Text v="title">Pick from this week's moves & active items</Text>
          <Rule />
          {candidates.length === 0 ? (
            <Text v="caption" tone="muted">No candidates. Run the weekly briefing to seed moves.</Text>
          ) : candidates.map((c) => (
            <Pressable key={`${c.kind}:${c.id}`} onPress={() => add(c.title, c)}>
              <Row justify="space-between" style={{ paddingVertical: t.space.xs }}>
                <Text v="body" style={{ flex: 1 }}>{c.title}</Text>
                <Text v="label" tone="muted">{c.kind === 'move' ? 'MOVE' : 'ITEM'} · pick →</Text>
              </Row>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Field
            label="Or write one freehand"
            value={draft}
            onChangeText={setDraft}
            placeholder="What will you actually move today?"
            onSubmitEditing={() => draft.trim() && add(draft.trim())}
          />
          <Button label="Add as order" onPress={() => draft.trim() && add(draft.trim())} disabled={!draft.trim()} />
        </View>
      </Card>

      <Button label="End-of-day micro-AAR" tone="ghost" onPress={() => router.push('/orders/aar')} />
    </Screen>
  );
}
