import React, { useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { Field } from './Field';
import { Button } from './Button';
import { Text } from './Text';
import { Row } from './Row';
import { Card } from './Card';
import { Stamp } from './Stamp';
import { useTheme } from '../theme/ThemeProvider';
import { parkThought } from '../lib/park';
import { listCompartments } from '../db/repos';
import type { Compartment } from '../db/schema';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ParkSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const [title, setTitle] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [compartments, setCompartments] = useState<Compartment[]>([]);

  React.useEffect(() => {
    if (visible) {
      (async () => setCompartments(await listCompartments()))();
      setTitle('');
      setChosen(null);
    }
  }, [visible]);

  const submit = async () => {
    if (!title.trim()) return;
    await parkThought(title, chosen ?? undefined, 'app');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => undefined} style={{ padding: t.space.base }}>
          <Card raised>
            <View style={{ gap: t.space.sm }}>
              <Stamp label="Park a thought" />
              <Field
                placeholder="What's on your mind?"
                value={title}
                onChangeText={setTitle}
                autoFocus
                multiline
                returnKeyType="default"
              />
              <Text v="label" tone="muted">Compartment (optional — defaults to uncategorized)</Text>
              <Row gap={t.space.sm} wrap>
                {compartments.map((c) => {
                  const on = chosen === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setChosen(on ? null : c.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: on ? t.colors.accent : t.colors.rule,
                        backgroundColor: on ? t.colors.accentLo : 'transparent',
                        paddingHorizontal: t.space.sm,
                        paddingVertical: 4,
                        borderRadius: t.radii.sm,
                      }}
                    >
                      <Text v="caption" tone={on ? 'primary' : 'secondary'}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </Row>
              <Row gap={t.space.sm}>
                <View style={{ flex: 1 }}><Button label="Cancel" tone="ghost" onPress={onClose} /></View>
                <View style={{ flex: 1 }}><Button label="Park" onPress={submit} disabled={!title.trim()} /></View>
              </Row>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
