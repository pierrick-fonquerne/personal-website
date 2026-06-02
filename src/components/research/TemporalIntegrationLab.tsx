import { useMemo, useState } from 'react';

import {
  createStatelessUnit,
  createLifNeuron,
  evaluate,
  checkRefutation,
  expectedLabel,
  TUNED_LIF,
  TASK_META,
  DEFAULT_SIMULATION,
  type TaskId,
  type RawStimulus,
} from '../../lib/research/temporal-neuron';

type Locale = 'fr' | 'en';

interface TemporalIntegrationLabProps {
  readonly initialTask?: TaskId;
  readonly trials?: number;
  readonly locale?: Locale;
}

interface TaskCopy {
  readonly id: TaskId;
  readonly label: string;
  readonly hint: string;
}

interface Strings {
  readonly tasks: readonly TaskCopy[];
  readonly pulseA: string;
  readonly pulseB: string;
  readonly stateless: string;
  readonly stateful: string;
  readonly fires: string;
  readonly yes: string;
  readonly no: string;
  readonly expected: string;
  readonly accuracy: string;
  readonly correct: string;
  readonly wrong: string;
  readonly threshold: string;
  readonly verdict: string;
  readonly held: string;
  readonly refuted: string;
  readonly windowSuffix: string;
}

const COPY: Record<Locale, Strings> = {
  fr: {
    tasks: [
      { id: 'T0', label: 'T0 simultanéité', hint: 'Décharger si A et B au même instant. Contrôle : le neurone sans état réussit.' },
      { id: 'T1', label: 'T1 coïncidence', hint: 'Décharger si A et B à quelques ms. Le neurone sans état échoue.' },
      { id: 'T2', label: 'T2 ordre', hint: 'Décharger si A précède B. Le neurone sans état ne peut pas distinguer l ordre.' },
    ],
    pulseA: 'Impulsion A',
    pulseB: 'Impulsion B',
    stateless: 'Neurone sans état',
    stateful: 'Neurone à état (LIF)',
    fires: 'Décharge',
    yes: 'oui',
    no: 'non',
    expected: 'attendu',
    accuracy: 'Précision sur la batterie',
    correct: 'correct',
    wrong: 'erreur',
    threshold: 'seuil',
    verdict: 'Verdict H1 :',
    held: 'tenue',
    refuted: 'réfutée',
    windowSuffix: 'ms de fenêtre',
  },
  en: {
    tasks: [
      { id: 'T0', label: 'T0 simultaneity', hint: 'Fire if A and B arrive at the same instant. Control: the stateless neuron succeeds.' },
      { id: 'T1', label: 'T1 coincidence', hint: 'Fire if A and B arrive within a few ms. The stateless neuron fails.' },
      { id: 'T2', label: 'T2 order', hint: 'Fire if A precedes B. The stateless neuron cannot tell the order.' },
    ],
    pulseA: 'Pulse A',
    pulseB: 'Pulse B',
    stateless: 'Stateless neuron',
    stateful: 'Stateful neuron (LIF)',
    fires: 'Fires',
    yes: 'yes',
    no: 'no',
    expected: 'expected',
    accuracy: 'Battery accuracy',
    correct: 'correct',
    wrong: 'wrong',
    threshold: 'threshold',
    verdict: 'H1 verdict:',
    held: 'holds',
    refuted: 'refuted',
    windowSuffix: 'ms window',
  },
};

const DURATION = DEFAULT_SIMULATION.durationMs;
const STATELESS = createStatelessUnit({ threshold: 2 });

function Verdict({ correct, copy }: { readonly correct: boolean; readonly copy: Strings }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
      }`}
    >
      {correct ? copy.correct : copy.wrong}
    </span>
  );
}

export default function TemporalIntegrationLab({
  initialTask = 'T0',
  trials = 100,
  locale = 'fr',
}: TemporalIntegrationLabProps) {
  const copy = COPY[locale];
  const [task, setTask] = useState<TaskId>(initialTask);
  const [tA, setTA] = useState(15);
  const [tB, setTB] = useState(21);

  const stimulus: RawStimulus = useMemo(
    () => ({ a: [tA], b: [tB], label: expectedLabel(task, { a: [tA], b: [tB] }) }),
    [task, tA, tB],
  );

  const lif = useMemo(() => createLifNeuron(TUNED_LIF[task]), [task]);

  const poorTrace = STATELESS.run(stimulus, DEFAULT_SIMULATION.dtMs, DURATION);
  const richTrace = lif.run(stimulus, DEFAULT_SIMULATION.dtMs, DURATION);
  const expected = stimulus.label;

  const poorAccuracy = evaluate(STATELESS, task, trials, 0.8).accuracy;
  const richAccuracy = evaluate(lif, task, trials, 0.8).accuracy;

  const verdict = useMemo(() => {
    const results = [
      evaluate(STATELESS, 'T1', trials, 0.8),
      evaluate(STATELESS, 'T2', trials, 0.8),
      evaluate(createLifNeuron(TUNED_LIF.T1), 'T1', trials, 0.8),
      evaluate(createLifNeuron(TUNED_LIF.T2), 'T2', trials, 0.8),
    ];
    return checkRefutation(results);
  }, [trials]);

  const potential = richTrace.potential ?? [];
  const threshold = TUNED_LIF[task].threshold;
  const vMax = Math.max(threshold * 1.4, ...potential, 0.1);
  const width = 520;
  const height = 130;
  const toX = (ms: number) => (ms / DURATION) * width;
  const toY = (v: number) => height - (v / vMax) * (height - 16) - 8;
  const curve = potential
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i * DEFAULT_SIMULATION.dtMs).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(' ');

  const activeTask = copy.tasks.find((t) => t.id === task);

  return (
    <div className="my-8 rounded-xl border border-slate-700 bg-slate-900/40 p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {copy.tasks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTask(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              task === t.id
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-slate-400">{activeTask?.hint}</p>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          {copy.pulseA} : <span className="font-mono text-sky-400">{tA.toFixed(1)} ms</span>
          <input
            type="range"
            min={5}
            max={40}
            step={0.5}
            value={tA}
            onChange={(e) => setTA(Number(e.target.value))}
            className="mt-1 w-full accent-sky-500"
          />
        </label>
        <label className="text-sm text-slate-300">
          {copy.pulseB} : <span className="font-mono text-amber-400">{tB.toFixed(1)} ms</span>
          <input
            type="range"
            min={5}
            max={40}
            step={0.5}
            value={tB}
            onChange={(e) => setTB(Number(e.target.value))}
            className="mt-1 w-full accent-amber-500"
          />
        </label>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mb-4 w-full rounded-lg bg-slate-950/60">
        <line x1={0} y1={toY(threshold)} x2={width} y2={toY(threshold)} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1} />
        <text x={6} y={toY(threshold) - 4} fill="#94a3b8" fontSize={10}>{copy.threshold}</text>
        <path d={curve} fill="none" stroke="#38bdf8" strokeWidth={2} />
        <line x1={toX(tA)} y1={8} x2={toX(tA)} y2={height - 8} stroke="#0ea5e9" strokeWidth={2} opacity={0.7} />
        <line x1={toX(tB)} y1={8} x2={toX(tB)} y2={height - 8} stroke="#f59e0b" strokeWidth={2} opacity={0.7} />
      </svg>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">{copy.stateless}</span>
            <Verdict correct={poorTrace.fired === expected} copy={copy} />
          </div>
          <p className="text-xs text-slate-400">
            {copy.fires} : {poorTrace.fired ? copy.yes : copy.no} ({copy.expected} : {expected ? copy.yes : copy.no})
          </p>
          <p className="mt-1 text-xs text-slate-500">{copy.accuracy} : {(poorAccuracy * 100).toFixed(0)} %</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">{copy.stateful}</span>
            <Verdict correct={richTrace.fired === expected} copy={copy} />
          </div>
          <p className="text-xs text-slate-400">
            {copy.fires} : {richTrace.fired ? copy.yes : copy.no} ({copy.expected} : {expected ? copy.yes : copy.no})
          </p>
          <p className="mt-1 text-xs text-slate-500">{copy.accuracy} : {(richAccuracy * 100).toFixed(0)} %</p>
        </div>
      </div>

      <p className="mt-4 text-sm">
        <span className="font-semibold text-slate-200">{copy.verdict} </span>
        <span className={verdict.h1Holds ? 'text-emerald-400' : 'text-rose-400'}>
          {verdict.h1Holds ? copy.held : copy.refuted}
        </span>
        <span className="text-slate-400"> ({TASK_META[task].windowMs} {copy.windowSuffix})</span>
      </p>
    </div>
  );
}
