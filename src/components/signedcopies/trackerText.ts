// The words on a list screen's signed-copy line.
type Counts = { signed: number; missing: number; notLinked: number } | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function trackerText(counts: Counts): { main: string; sub: string } {
  if (!counts) return { main: "Can't count, W: offline", sub: '' };
  const total = counts.signed + counts.missing;
  const parts: string[] = [];
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts.notLinked) parts.push(plural(counts.notLinked, 'file not linked', 'files not linked'));
  return { main: total ? `${counts.signed} of ${total} signed` : 'No rows yet', sub: parts.join(' · ') };
}
