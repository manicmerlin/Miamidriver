import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
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
import { ordersForDate, markOrderHonored } from '@/db/repos';
import { startOfDay } from '@/lib/rhythm';
import { emit } from '@/lib/webhook';
import type { DailyOrder } from '@/db/schema';

export default function MicroAar() {
  const t = useTheme();
  const router = useRouter();
  const [today] = useState(startOfDay().getTime());
  const [orders, setOrders] = useState<DailyOrder[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setOrders(await ordersForDate(today));
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mark = async (id: string, honored: boolean) => {
    await markOrderHonored(id, honored, reasons[id]);
    if (!honored) void emit('order.unhonored', { order_id: id, reason: reasons[id] ?? '' });
    load();
  };

  return (
    <Screen>
      <Stamp label="OODA · end of day" />
      <Text v="heading">Honored?</Text>
      <Text v="caption" tone="muted">
        For each order: was it honored? If not, one honest line on why.
      </Text>

      {orders.length === 0 ? (
        <Card><Text v="caption" tone="muted">No orders to review.</Text></Card>
      ) : null}

      {orders.map((o) => (
        <Card key={o.id}>
          <View style={{ gap: t.space.sm }}>
            <Text v="title">{o.title}</Text>
            <Row gap={t.space.sm}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Honored"
                  tone={o.honored === true ? 'primary' : 'ghost'}
                  onPress={() => mark(o.id, true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Not honored"
                  tone={o.honored === false ? 'danger' : 'ghost'}
                  onPress={() => mark(o.id, false)}
                />
              </View>
            </Row>
            {o.honored === false ? (
              <Field
                label="Why (one line)"
                value={reasons[o.id] ?? o.reason ?? ''}
                onChangeText={(v) => setReasons({ ...reasons, [o.id]: v })}
                onBlur={() => mark(o.id, false)}
                placeholder="Honest, not hopeful."
              />
            ) : null}
            <Rule />
            <Text v="label" tone="muted">{statusLabel(o)}</Text>
          </View>
        </Card>
      ))}

      <Button label="Done" onPress={() => router.replace('/')} />
    </Screen>
  );
}

function statusLabel(o: DailyOrder) {
  if (o.honored === true) return 'HONORED';
  if (o.honored === false) return 'NOT HONORED';
  return 'AWAITING REVIEW';
}
