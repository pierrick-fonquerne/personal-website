import { useMemo, useState, type JSX } from 'react';
import { mulberry32 } from './dimension-curse/dimension-curse';
import {
  planWrite,
  simulateCrash,
  roundTripLogicalEquals,
  roundTripBytesEqual,
  type IndexState,
  type PersistenceStrategy,
  type SerializeOptions,
  type WriteStep,
} from './durable-index/durable-index';

// ---------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------

const COLOR_OK = '#22c55e';
const COLOR_BAD = '#ef4444';
const COLOR_AMBER = '#f59e0b';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DurableIndexLabProps {
  oldCount: number;
  newCount: number; // > oldCount
  initialStrategy?: PersistenceStrategy;
  labels: {
    strategyTitle: string;
    strategyInPlace: string;
    strategyAtomic: string;
    strategySnapshot: string;
    strategyAppend: string;
    crashTitle: string;
    crashSliderLabel: string;
    crashHint: string;
    stepsTitle: string;
    stepExecutedLabel: string;
    stepPendingLabel: string;
    stepWriteBlockMain: string;
    stepWriteBlockTemp: string;
    stepWriteBlockSnapshot: string;
    stepAppendRecord: string;
    stepFsyncMain: string;
    stepFsyncTemp: string;
    stepFsyncSnapshot: string;
    stepFsyncLog: string;
    stepRename: string;
    verdictTitle: string;
    statusNewIntact: string;
    statusOldIntact: string;
    statusStale: string;
    statusCorrupted: string;
    recoveredLabel: string;
    recoveredNodes: string;
    recoveredNoneLabel: string;
    oracleTitle: string;
    oracleHint: string;
    bugLossyFloat: string;
    bugNonDeterministic: string;
    logicalCheckLabel: string;
    byteOracleLabel: string;
    passLabel: string;
    failLabel: string;
    oracleBlindHint: string;
  };
}

// ---------------------------------------------------------------------------
// Utilitaire : libelle humanise d'une etape
// ---------------------------------------------------------------------------

function stepLabel(step: WriteStep, labels: DurableIndexLabProps['labels']): string {
  const n = step.blockIndex !== undefined ? String(step.blockIndex) : '?';
  if (step.kind === 'writeBlock') {
    if (step.target === 'main') return labels.stepWriteBlockMain.replace('{n}', n);
    if (step.target === 'temp') return labels.stepWriteBlockTemp.replace('{n}', n);
    return labels.stepWriteBlockSnapshot.replace('{n}', n);
  }
  if (step.kind === 'appendRecord') return labels.stepAppendRecord.replace('{n}', n);
  if (step.kind === 'fsync') {
    if (step.target === 'main') return labels.stepFsyncMain;
    if (step.target === 'temp') return labels.stepFsyncTemp;
    if (step.target === 'snapshot') return labels.stepFsyncSnapshot;
    return labels.stepFsyncLog;
  }
  // rename
  return labels.stepRename;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function DurableIndexLab({
  oldCount,
  newCount,
  initialStrategy,
  labels,
}: DurableIndexLabProps): JSX.Element {
  // -- Selecteur de strategie
  const [strategy, setStrategy] = useState<PersistenceStrategy>(
    initialStrategy ?? 'inPlaceOverwrite',
  );

  // -- Point de crash (nombre d'etapes executees avant la panne)
  const [crashPoint, setCrashPoint] = useState<number>(0);

  // -- Bugs oracle
  const [bugLossyFloat, setBugLossyFloat] = useState<boolean>(false);
  const [bugNonDeterministic, setBugNonDeterministic] = useState<boolean>(false);

  // -- Construction des etats (deterministe)
  const { oldState, newState } = useMemo<{ oldState: IndexState; newState: IndexState }>(() => {
    const rng = mulberry32(1);
    const ns: IndexState = Array.from({ length: newCount }, (_, i) => ({
      id: i,
      vector: [rng(), rng()],
      neighbors: [(i + 1) % newCount, (i + 2) % newCount],
    }));
    return { oldState: ns.slice(0, oldCount), newState: ns };
  }, [oldCount, newCount]);

  // -- Plan d'ecriture
  const plan = useMemo(
    () => planWrite(strategy, oldState, newState),
    [strategy, oldState, newState],
  );

  // Clamp du point de crash si le plan est plus court que la valeur stockee
  const clampedCrash = Math.min(crashPoint, plan.length);

  // -- Verdict
  const report = useMemo(
    () => simulateCrash(strategy, oldState, newState, clampedCrash),
    [strategy, oldState, newState, clampedCrash],
  );

  // -- Oracle round-trip
  const oracleOpts = useMemo<SerializeOptions>(
    () => ({ lossyFloat: bugLossyFloat, nonDeterministicOrder: bugNonDeterministic }),
    [bugLossyFloat, bugNonDeterministic],
  );
  const logical = useMemo(
    () => roundTripLogicalEquals(newState, oracleOpts),
    [newState, oracleOpts],
  );
  const bytes = useMemo(
    () => roundTripBytesEqual(newState, oracleOpts),
    [newState, oracleOpts],
  );

  // -- Couleur du panneau verdict
  const verdictColor =
    report.status === 'newIntact'
      ? COLOR_OK
      : report.status === 'corrupted'
        ? COLOR_BAD
        : COLOR_AMBER;

  // -- Libelle du statut
  const statusText =
    report.status === 'newIntact'
      ? labels.statusNewIntact
      : report.status === 'oldIntact'
        ? labels.statusOldIntact
        : report.status === 'staleButIntact'
          ? labels.statusStale
          : labels.statusCorrupted;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">

      {/* Selecteur de strategie */}
      <div className="mb-5">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.strategyTitle}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['inPlaceOverwrite', labels.strategyInPlace],
              ['atomicRename', labels.strategyAtomic],
              ['snapshot', labels.strategySnapshot],
              ['appendOnlyLog', labels.strategyAppend],
            ] as [PersistenceStrategy, string][]
          ).map(([id, lbl]) => {
            const active = strategy === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setStrategy(id);
                  setCrashPoint(0);
                }}
                className={[
                  'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
                  active
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
                ].join(' ')}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Colonne gauche : slider crash + liste des etapes */}
        <div className="flex flex-col gap-4">

          {/* Slider crash */}
          <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.crashTitle}
            </p>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
                {labels.crashSliderLabel}{' '}
                <span className="font-semibold text-[var(--color-accent)]">{clampedCrash}</span>
                {' / '}
                <span>{plan.length}</span>
              </span>
              <input
                type="range"
                min={0}
                max={plan.length}
                step={1}
                value={clampedCrash}
                aria-label={labels.crashSliderLabel}
                onChange={(e) => setCrashPoint(Number(e.target.value))}
                className="learning-slider"
              />
            </label>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
              {labels.crashHint}
            </p>
          </div>

          {/* Liste des etapes */}
          <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.stepsTitle}
            </p>
            <ol className="flex flex-col gap-1">
              {plan.map((step, s) => {
                const executed = s < clampedCrash;
                const isCrashLine = s === clampedCrash && clampedCrash < plan.length;
                return (
                  <li
                    key={s}
                    className={[
                      'flex items-center gap-2 rounded px-2 py-1 font-mono text-[11px] transition-colors',
                      isCrashLine
                        ? 'border border-[#ef4444] bg-[#ef444411]'
                        : '',
                    ].join(' ')}
                    style={{ opacity: executed || isCrashLine ? 1 : 0.45 }}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: executed
                          ? 'var(--color-accent)'
                          : isCrashLine
                            ? COLOR_BAD
                            : 'var(--color-line)',
                      }}
                    />
                    <span className={executed ? 'text-[var(--color-fg-muted)]' : 'text-[var(--color-fg-dim)]'}>
                      {stepLabel(step, labels)}
                    </span>
                    <span className="ml-auto text-[10px] text-[var(--color-fg-dim)]">
                      {executed ? labels.stepExecutedLabel : labels.stepPendingLabel}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Colonne droite : verdict + oracle */}
        <div className="flex flex-col gap-4">

          {/* Verdict apres crash */}
          <div
            className="rounded border p-4"
            style={{ borderColor: verdictColor, backgroundColor: `${verdictColor}18` }}
          >
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.verdictTitle}
            </p>
            <p
              className="mb-3 font-mono text-[13px] font-semibold"
              style={{ color: verdictColor }}
            >
              {statusText}
            </p>
            <p className="font-mono text-[11px] text-[var(--color-fg-muted)]">
              {report.recovered !== null
                ? `${labels.recoveredLabel} : ${report.recovered.length} ${labels.recoveredNodes}`
                : labels.recoveredNoneLabel}
            </p>
          </div>

          {/* Oracle round-trip */}
          <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.oracleTitle}
            </p>
            <p className="mb-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
              {labels.oracleHint}
            </p>

            {/* Interrupteurs de bug */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBugLossyFloat((v) => !v)}
                aria-pressed={bugLossyFloat}
                className={[
                  'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
                  bugLossyFloat
                    ? 'border-[#ef4444] bg-[#ef444422] text-[#ef4444]'
                    : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
                ].join(' ')}
              >
                {labels.bugLossyFloat}
              </button>
              <button
                type="button"
                onClick={() => setBugNonDeterministic((v) => !v)}
                aria-pressed={bugNonDeterministic}
                className={[
                  'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
                  bugNonDeterministic
                    ? 'border-[#ef4444] bg-[#ef444422] text-[#ef4444]'
                    : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
                ].join(' ')}
              >
                {labels.bugNonDeterministic}
              </button>
            </div>

            {/* Resultats */}
            <ul className="flex flex-col gap-2">
              {(
                [
                  [labels.logicalCheckLabel, logical],
                  [labels.byteOracleLabel, bytes],
                ] as [string, boolean][]
              ).map(([checkLabel, pass]) => (
                <li key={checkLabel} className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: pass ? `${COLOR_OK}22` : `${COLOR_BAD}22`,
                      color: pass ? COLOR_OK : COLOR_BAD,
                    }}
                  >
                    {pass ? '✓' : '✗'}
                  </span>
                  <span className="text-[var(--color-fg-muted)]">{checkLabel}</span>
                  <span
                    className="ml-auto font-semibold"
                    style={{ color: pass ? COLOR_OK : COLOR_BAD }}
                  >
                    {pass ? labels.passLabel : labels.failLabel}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
              {labels.oracleBlindHint}
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}
