import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Stamp } from '@/components/Stamp';
import { Rule } from '@/components/Rule';
import { Row } from '@/components/Row';
import { FAB } from '@/components/FAB';
import { ParkSheet } from '@/components/ParkSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { nextDueRitual } from '@/lib/rhythm';
import { ordersForDate, listParkedAll, listCompartments } from '@/db/repos';
import { startOfDay } from '@/lib/rhythm';
import { pullRemoteCaptures } from '@/lib/webhook';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const [parkOpen, setParkOpen] = useState(false);
  const [next, setNext] = useState<{ ritual: string; due: Date; overdueDays: number } | null>(null);
  const [orders, setOrders] = useState<{ id: string; title: string }[]>([]);
  const [parked, setParked] = useState(0);
  const [compartmentCount, setCompartmentCount] = useState(0);

  const refresh = useCallback(async () => {
    void pullRemoteCaptures();
    const today = startOfDay().getTime();
    setNext(await nextDueRitual());
    setOrders((await ordersForDate(today)).map((o) => ({ id: o.id, title: o.title })));
    setParked((await listParkedAll()).length);
    setCompartmentCount((await listCompartments()).length);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <Screen>
      <View style={{ gap: t.space.xs }}>
        <Stamp label="Operating Rhythm" />
        <Text v="display">Rhythm</Text>
      </View>

      {next ? (
        <Pressable onPress={() => goRitual(router, next.ritual)}>
          <Card raised>
            <Row justify="space-between">
              <View>
                <Text v="label" tone="muted">Next ritual</Text>
                <Text v="title">{titleFor(next.ritual)}</Text>
                <Text v="caption" tone="secondary">{dueText(next.due, next.overdueDays)}</Text>
              </View>
              <Stamp
                label={next.overdueDays > 0 ? 'Overdue' : 'On cadence'}
                tone={next.overdueDays > 0 ? 'red' : 'green'}
              />
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <Card>
        <View style={{ gap: t.space.sm }}>
          <Row justify="space-between">
            <Text v="title">Today's orders</Text>
            <Pressable onPress={() => router.push('/orders')}>
              <Text v="caption" tone="accent">{orders.length}/3 →</Text>
            </Pressable>
          </Row>
          <Rule />
          {orders.length === 0 ? (
            <Text v="caption" tone="muted">No orders set. Open Daily Orders to choose 1–3 for today.</Text>
          ) : (
            orders.map((o) => (
              <Text key={o.id} v="body">• {o.title}</Text>
            ))
          )}
        </View>
      </Card>

      <Row gap={t.space.sm}>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => router.push('/compartments')}>
            <Card><View style={{ gap: 4 }}>
              <Text v="label" tone="muted">Compartments</Text>
              <Text v="title">{compartmentCount}</Text>
            </View></Card>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => router.push('/compartments')}>
            <Card><View style={{ gap: 4 }}>
              <Text v="label" tone="muted">Parked</Text>
              <Text v="title" tone={parked > 0 ? 'amber' : 'primary'}>{parked}</Text>
            </View></Card>
          </Pressable>
        </View>
      </Row>

      <Row gap={t.space.sm}>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => router.push('/defaults')}>
            <Card><Text v="caption" tone="accent">Defaults review →</Text></Card>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => router.push('/settings')}>
            <Card><Text v="caption" tone="accent">Settings →</Text></Card>
          </Pressable>
        </View>
      </Row>

      <FAB label="Park" onPress={() => setParkOpen(true)} />
      <ParkSheet visible={parkOpen} onClose={() => { setParkOpen(false); refresh(); }} />
    </Screen>
  );
}

function titleFor(r: string) {
  if (r === 'weekly_briefing') return 'Weekly briefing';
  if (r === 'daily_orders') return 'Daily orders';
  if (r === 'defaults_review') return 'Defaults review';
  return r;
}

function dueText(due: Date, overdue: number) {
  if (overdue > 0) return `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`;
  return `Due ${due.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
}

function goRitual(router: ReturnType<typeof useRouter>, r: string) {
  if (r === 'weekly_briefing') router.push('/briefing');
  else if (r === 'daily_orders') router.push('/orders');
  else router.push('/defaults');
}
