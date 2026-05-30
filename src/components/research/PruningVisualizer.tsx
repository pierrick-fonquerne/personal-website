import { useMemo, useState, type JSX } from 'react';

interface Props {
  labels?: {
    sparsity?: string;
    active?: string;
    help?: string;
  };
}

const WIDTH = 420;
const HEIGHT = 240;
const PAD = 28;
const INPUTS = 3;
const HIDDEN = 5;
const OUTPUTS = 2;

interface Point {
  x: number;
  y: number;
}

interface Synapse {
  from: Point;
  to: Point;
  weight: number;
}

function seeded(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function columnY(count: number, index: number): number {
  if (count === 1) {
    return HEIGHT / 2;
  }
  return PAD + (index * (HEIGHT - 2 * PAD)) / (count - 1);
}

function buildSynapses(): Synapse[] {
  const random = seeded(42);
  const inputX = PAD;
  const hiddenX = WIDTH / 2;
  const outputX = WIDTH - PAD;
  const synapses: Synapse[] = [];
  for (let i = 0; i < INPUTS; i += 1) {
    for (let h = 0; h < HIDDEN; h += 1) {
      synapses.push({
        from: { x: inputX, y: columnY(INPUTS, i) },
        to: { x: hiddenX, y: columnY(HIDDEN, h) },
        weight: random() * 2 - 1,
      });
    }
  }
  for (let h = 0; h < HIDDEN; h += 1) {
    for (let o = 0; o < OUTPUTS; o += 1) {
      synapses.push({
        from: { x: hiddenX, y: columnY(HIDDEN, h) },
        to: { x: outputX, y: columnY(OUTPUTS, o) },
        weight: random() * 2 - 1,
      });
    }
  }
  return synapses;
}

function buildNeurons(): Array<Point & { io: boolean }> {
  const list: Array<Point & { io: boolean }> = [];
  for (let i = 0; i < INPUTS; i += 1) {
    list.push({ x: PAD, y: columnY(INPUTS, i), io: true });
  }
  for (let h = 0; h < HIDDEN; h += 1) {
    list.push({ x: WIDTH / 2, y: columnY(HIDDEN, h), io: false });
  }
  for (let o = 0; o < OUTPUTS; o += 1) {
    list.push({ x: WIDTH - PAD, y: columnY(OUTPUTS, o), io: true });
  }
  return list;
}

export default function PruningVisualizer({ labels = {} }: Props): JSX.Element {
  const synapses = useMemo(buildSynapses, []);
  const neurons = useMemo(buildNeurons, []);
  const [sparsity, setSparsity] = useState(0);

  const total = synapses.length;
  const sortedAscending = useMemo(
    () => [...synapses].sort((a, b) => Math.abs(a.weight) - Math.abs(b.weight)),
    [synapses],
  );
  const cutCount = Math.floor(sparsity * total);
  const removed = new Set(sortedAscending.slice(0, cutCount));
  const activeCount = total - cutCount;

  const sparsityLabel = labels.sparsity ?? 'Élagage';
  const activeLabel = labels.active ?? 'Connexions actives';
  const helpText =
    labels.help ??
    "Glisse pour retirer d'abord les connexions les plus faibles. Le réseau garde sa charpente bien après avoir perdu la moitié de ses liens.";

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <p className="mb-4 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${activeLabel}: ${activeCount} / ${total}`}
        className="w-full max-w-[420px]"
      >
        {synapses.map((synapse, index) => {
          if (removed.has(synapse)) {
            return null;
          }
          const opacity = 0.12 + Math.abs(synapse.weight) * 0.7;
          return (
            <line
              key={index}
              x1={synapse.from.x}
              y1={synapse.from.y}
              x2={synapse.to.x}
              y2={synapse.to.y}
              stroke="var(--color-accent)"
              strokeOpacity={opacity}
              strokeWidth={1}
            />
          );
        })}
        {neurons.map((neuron, index) => (
          <circle
            key={index}
            cx={neuron.x}
            cy={neuron.y}
            r={9}
            fill="var(--color-bg)"
            stroke={neuron.io ? 'var(--color-accent)' : 'var(--color-fg-muted)'}
            strokeWidth={2}
          />
        ))}
      </svg>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="flex justify-between font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg-dim)] uppercase">
            <span>{sparsityLabel}</span>
            <span className="text-[var(--color-fg)]">{(sparsity * 100).toFixed(0)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={sparsity}
            onChange={(event) => setSparsity(Number(event.target.value))}
            className="learning-slider"
            aria-label={sparsityLabel}
          />
        </label>
        <dl className="flex gap-2 font-mono text-[12px]">
          <dt className="text-[var(--color-fg-dim)] uppercase">{activeLabel}</dt>
          <dd className="text-[var(--color-fg)]">
            {activeCount} / {total}
          </dd>
        </dl>
      </div>
    </figure>
  );
}
