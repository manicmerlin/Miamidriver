import { createCompartment, listCompartments } from './repos';

export const STARTER_COMPARTMENTS = [
  { name: 'Health', sop_keystone: 'Move daily, sleep 7+ hours.' },
  { name: 'Finances', sop_keystone: 'Weekly review of cash position.' },
  { name: 'Career', sop_keystone: 'Ship one meaningful unit of work per week.' },
  { name: 'Relationships', sop_keystone: 'One real conversation per day.' },
  { name: 'Home', sop_keystone: 'Reset surfaces nightly.' },
  { name: 'Personal Growth', sop_keystone: 'Read 30 min daily.' },
];

export type StarterPick = { name: string; sop_keystone?: string | null };

export async function ensureStarterCompartments(picks: StarterPick[]) {
  const existing = await listCompartments();
  if (existing.length > 0) return existing;
  for (let i = 0; i < picks.length; i++) {
    const c = picks[i]!;
    await createCompartment({
      name: c.name,
      order_index: i,
      open_boundary: false,
      sop_keystone: c.sop_keystone ?? null,
      sop_normal: null,
      sop_minimum: null,
      review_cycle: 'weekly',
      archived: false,
    });
  }
  return listCompartments();
}
