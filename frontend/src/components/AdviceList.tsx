import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import type { Advice } from '../lib/advice';

interface Props {
  items: Advice[];
}

export default function AdviceList({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <AdviceItem key={i} item={item} />
      ))}
    </ul>
  );
}

function AdviceItem({ item }: { item: Advice }) {
  const palette =
    item.severity === 'warn'
      ? 'border-amber-500/40 bg-amber-500/5 text-amber-200'
      : item.severity === 'good'
        ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200'
        : 'border-zinc-700/60 bg-zinc-900 text-zinc-200';
  const Icon =
    item.severity === 'warn' ? AlertTriangle : item.severity === 'good' ? CheckCircle2 : Info;
  return (
    <li className={`rounded-lg border p-2.5 text-xs ${palette}`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{item.title}</div>
          <p className="mt-1 text-[11px] leading-snug text-zinc-300">{item.detail}</p>
        </div>
      </div>
    </li>
  );
}
