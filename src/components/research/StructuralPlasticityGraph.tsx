import { useMemo, useRef, useState, type JSX } from 'react';

type NeuronKind = 'input' | 'hidden' | 'output';

interface Neuron {
  id: string;
  kind: NeuronKind;
}

interface Synapse {
  id: string;
  from: string;
  to: string;
}

interface GraphState {
  neurons: Neuron[];
  synapses: Synapse[];
}

interface Props {
  initialHidden?: number;
  labels?: {
    addNeuron?: string;
    removeNeuron?: string;
    addSynapse?: string;
    removeSynapse?: string;
    reset?: string;
    neuronsLabel?: string;
    synapsesLabel?: string;
    helpText?: string;
  };
}

const WIDTH = 360;
const HEIGHT = 280;
const PAD = 38;
const RADIUS = 13;

const LAYER_ORDER: Record<NeuronKind, number> = { input: 0, hidden: 1, output: 2 };
const INITIAL_SYNAPSES = 3;

function buildInitialState(hidden: number): GraphState {
  const neurons: Neuron[] = [
    { id: 'i0', kind: 'input' },
    { id: 'i1', kind: 'input' },
    { id: 'o0', kind: 'output' },
  ];
  for (let i = 0; i < hidden; i += 1) {
    neurons.push({ id: `h${i}`, kind: 'hidden' });
  }
  const synapses: Synapse[] = [];
  if (hidden > 0) {
    synapses.push({ id: 's0', from: 'i0', to: 'h0' });
    synapses.push({ id: 's1', from: 'i1', to: 'h0' });
    synapses.push({ id: 's2', from: `h${hidden - 1}`, to: 'o0' });
  }
  return { neurons, synapses };
}

function computePositions(neurons: Neuron[]): Map<string, { x: number; y: number }> {
  const byKind: Record<NeuronKind, Neuron[]> = { input: [], hidden: [], output: [] };
  for (const neuron of neurons) {
    byKind[neuron.kind].push(neuron);
  }
  const columnX: Record<NeuronKind, number> = {
    input: PAD,
    hidden: WIDTH / 2,
    output: WIDTH - PAD,
  };
  const positions = new Map<string, { x: number; y: number }>();
  (Object.keys(byKind) as NeuronKind[]).forEach((kind) => {
    const column = byKind[kind];
    column.forEach((neuron, index) => {
      const slots = column.length;
      const y = slots === 1 ? HEIGHT / 2 : PAD + (index * (HEIGHT - 2 * PAD)) / (slots - 1);
      positions.set(neuron.id, { x: columnX[kind], y });
    });
  });
  return positions;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function StructuralPlasticityGraph({
  initialHidden = 3,
  labels = {},
}: Props): JSX.Element {
  const [state, setState] = useState<GraphState>(() => buildInitialState(initialHidden));
  const neuronCounter = useRef(initialHidden);
  const synapseCounter = useRef(INITIAL_SYNAPSES);

  const positions = useMemo(() => computePositions(state.neurons), [state.neurons]);
  const hiddenCount = state.neurons.filter((neuron) => neuron.kind === 'hidden').length;

  const addNeuron = (): void => {
    const id = `h${neuronCounter.current}`;
    neuronCounter.current += 1;
    setState((current) => ({
      ...current,
      neurons: [...current.neurons, { id, kind: 'hidden' }],
    }));
  };

  const removeNeuron = (): void => {
    setState((current) => {
      const hidden = current.neurons.filter((neuron) => neuron.kind === 'hidden');
      if (hidden.length === 0) {
        return current;
      }
      const victim = pickRandom(hidden);
      return {
        neurons: current.neurons.filter((neuron) => neuron.id !== victim.id),
        synapses: current.synapses.filter(
          (synapse) => synapse.from !== victim.id && synapse.to !== victim.id,
        ),
      };
    });
  };

  const addSynapse = (): void => {
    setState((current) => {
      const candidates: Array<{ from: string; to: string }> = [];
      for (const source of current.neurons) {
        for (const target of current.neurons) {
          if (source.id === target.id) {
            continue;
          }
          if (LAYER_ORDER[source.kind] >= LAYER_ORDER[target.kind]) {
            continue;
          }
          const exists = current.synapses.some(
            (synapse) => synapse.from === source.id && synapse.to === target.id,
          );
          if (!exists) {
            candidates.push({ from: source.id, to: target.id });
          }
        }
      }
      if (candidates.length === 0) {
        return current;
      }
      const chosen = pickRandom(candidates);
      const id = `s${synapseCounter.current}`;
      synapseCounter.current += 1;
      return {
        ...current,
        synapses: [...current.synapses, { id, from: chosen.from, to: chosen.to }],
      };
    });
  };

  const removeSynapse = (): void => {
    setState((current) => {
      if (current.synapses.length === 0) {
        return current;
      }
      const victim = pickRandom(current.synapses);
      return {
        ...current,
        synapses: current.synapses.filter((synapse) => synapse.id !== victim.id),
      };
    });
  };

  const reset = (): void => {
    neuronCounter.current = initialHidden;
    synapseCounter.current = INITIAL_SYNAPSES;
    setState(buildInitialState(initialHidden));
  };

  const addNeuronLabel = labels.addNeuron ?? 'Ajouter un neurone';
  const removeNeuronLabel = labels.removeNeuron ?? 'Retirer un neurone';
  const addSynapseLabel = labels.addSynapse ?? 'Ajouter une synapse';
  const removeSynapseLabel = labels.removeSynapse ?? 'Retirer une synapse';
  const resetLabel = labels.reset ?? 'Réinitialiser';
  const neuronsLabel = labels.neuronsLabel ?? 'Neurones';
  const synapsesLabel = labels.synapsesLabel ?? 'Synapses';
  const helpText =
    labels.helpText ??
    'Modifie la structure du réseau en direct. Tout est ajouté ou retiré au hasard, sans aucun critère.';

  const graphDescription = `${neuronsLabel}: ${state.neurons.length}, ${synapsesLabel}: ${state.synapses.length}`;

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="grid items-start gap-6 sm:grid-cols-[360px_1fr]">
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={graphDescription}
          className="w-full max-w-[360px]"
        >
          {state.synapses.map((synapse) => {
            const from = positions.get(synapse.from);
            const to = positions.get(synapse.to);
            if (!from || !to) {
              return null;
            }
            return (
              <line
                key={synapse.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--color-line-strong)"
                strokeWidth={1.5}
              />
            );
          })}
          {state.neurons.map((neuron) => {
            const point = positions.get(neuron.id);
            if (!point) {
              return null;
            }
            const isIo = neuron.kind !== 'hidden';
            return (
              <circle
                key={neuron.id}
                cx={point.x}
                cy={point.y}
                r={RADIUS}
                fill="var(--color-bg)"
                stroke={isIo ? 'var(--color-accent)' : 'var(--color-fg-muted)'}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={addNeuron}
              aria-label={addNeuronLabel}
            >
              + {neuronsLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={removeNeuron}
              disabled={hiddenCount === 0}
              aria-label={removeNeuronLabel}
            >
              - {neuronsLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={addSynapse}
              aria-label={addSynapseLabel}
            >
              + {synapsesLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={removeSynapse}
              disabled={state.synapses.length === 0}
              aria-label={removeSynapseLabel}
            >
              - {synapsesLabel}
            </button>
            <button type="button" className={buttonClass} onClick={reset} aria-label={resetLabel}>
              {resetLabel}
            </button>
          </div>

          <dl className="flex gap-6 font-mono text-[12px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase">
            <div className="flex items-baseline gap-2">
              <dt>{neuronsLabel}</dt>
              <dd className="text-[16px] text-[var(--color-fg)]">{state.neurons.length}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>{synapsesLabel}</dt>
              <dd className="text-[16px] text-[var(--color-fg)]">{state.synapses.length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </figure>
  );
}
