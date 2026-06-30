import { park } from '../db/repos';
import { emit } from './webhook';

export async function parkThought(
  title: string,
  compartmentId?: string,
  source: 'app' | 'share' | 'telegram' = 'app',
) {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const id = await park(trimmed, compartmentId, source);
  void emit('thought.parked', { title: trimmed, compartment_id: compartmentId ?? null, source });
  return id;
}
