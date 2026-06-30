import type { Compartment, CompartmentStatus, WeeklyMove } from '../db/schema';

type Input = {
  weekStart: number;
  compartments: Compartment[];
  statuses: CompartmentStatus[];
  moves: WeeklyMove[];
};

/**
 * BLUF generator (spec §F1). Output is Markdown, ready for paste, share,
 * or n8n→Telegram. Format: bottom line up front, then per-compartment key
 * judgments (status + moves), then supporting detail (none yet — Phase 2
 * will append observation/interpreted splits when honesty mode is on).
 */
export function buildBluf(input: Input): string {
  const { weekStart, compartments, statuses, moves } = input;
  const date = new Date(weekStart).toISOString().slice(0, 10);

  const moveCount = moves.length;
  const compartmentsCovered = new Set(statuses.map((s) => s.compartment_id)).size;

  const bottomLine =
    `Week of ${date}: ${compartmentsCovered}/${compartments.length} compartments reviewed; ` +
    `${moveCount} moves committed for the week.`;

  const lines: string[] = [];
  lines.push('## BLUF');
  lines.push(bottomLine);
  lines.push('');
  lines.push('## Key judgments by compartment');

  for (const c of compartments) {
    const status = statuses.find((s) => s.compartment_id === c.id);
    if (!status) continue;
    const movesHere = moves.filter((m) => m.compartment_id === c.id);
    lines.push('');
    lines.push(`### ${c.name}`);
    lines.push(`- Status: ${status.status_line}`);
    if (movesHere.length) {
      lines.push('- Moves this week:');
      for (const m of movesHere) {
        const tag = m.likelihood_term ? ` _(${m.likelihood_term})_` : '';
        lines.push(`  - ${m.title}${tag}`);
      }
    } else {
      lines.push('- Moves this week: _(none committed)_');
    }
    if (c.sop_keystone) {
      lines.push(`- Keystone behavior: ${c.sop_keystone}`);
    }
  }

  return lines.join('\n');
}
