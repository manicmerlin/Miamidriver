import React, { useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Button } from './Button';
import { Field } from './Field';
import { Row } from './Row';
import { Stamp } from './Stamp';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;
  itemTitle: string;
  onClose: () => void;
  onExit: (exit: 'completed' | 'someday' | 'discarded', reason: string) => void | Promise<void>;
};

/**
 * Forced three-exit modal (spec C2): completed / file to Someday / discarded.
 * The Active File never silently shrinks — every exit is logged with a
 * reason for the AAR / decision-journal trail.
 */
export function ExitModal({ visible, itemTitle, onClose, onExit }: Props) {
  const t = useTheme();
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<'completed' | 'someday' | 'discarded' | null>(null);

  const reset = () => { setReason(''); setChoice(null); };
  const close = () => { reset(); onClose(); };
  const confirm = async () => {
    if (!choice) return;
    await onExit(choice, reason);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' }}>
        <Pressable onPress={() => undefined} style={{ padding: t.space.base }}>
          <Card raised>
            <View style={{ gap: t.space.sm }}>
              <Stamp label="Exit item" />
              <Text v="title">{itemTitle}</Text>
              <Text v="caption" tone="muted">
                Items leave the Active File three ways only. No silent deletion.
              </Text>
              <Row gap={t.space.sm}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Complete"
                    tone={choice === 'completed' ? 'primary' : 'ghost'}
                    onPress={() => setChoice('completed')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Someday"
                    tone={choice === 'someday' ? 'primary' : 'ghost'}
                    onPress={() => setChoice('someday')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Discard"
                    tone={choice === 'discarded' ? 'danger' : 'ghost'}
                    onPress={() => setChoice('discarded')}
                  />
                </View>
              </Row>
              <Field
                label="Reason (logged)"
                value={reason}
                onChangeText={setReason}
                placeholder="Why this exit — honest, brief."
                multiline
              />
              <Row gap={t.space.sm}>
                <View style={{ flex: 1 }}><Button label="Cancel" tone="ghost" onPress={close} /></View>
                <View style={{ flex: 1 }}><Button label="Confirm exit" onPress={confirm} disabled={!choice} /></View>
              </Row>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
