import React, { useEffect, useState } from 'react';
import { View, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Stamp } from '@/components/Stamp';
import { Row } from '@/components/Row';
import { db } from '@/db/client';
import { briefing } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';

export default function BriefingResult() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bluf, setBluf] = useState<string>('');

  useEffect(() => { (async () => {
    if (!id) return;
    const rows = await db.select().from(briefing).where(eq(briefing.id, id));
    setBluf(rows[0]?.bluf ?? '');
  })(); }, [id]);

  return (
    <Screen>
      <View style={{ gap: t.space.xs }}>
        <Stamp label="Disseminated" tone="green" />
        <Text v="display">BLUF</Text>
        <Text v="caption" tone="muted">
          Bottom line up front — share to Telegram via n8n or copy.
        </Text>
      </View>

      <Card raised>
        <Text v="serif" selectable>{bluf || '—'}</Text>
      </Card>

      <Row gap={t.space.sm}>
        <View style={{ flex: 1 }}>
          <Button label="Share / copy" onPress={() => Share.share({ message: bluf })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Home" tone="ghost" onPress={() => router.replace('/')} />
        </View>
      </Row>
    </Screen>
  );
}
