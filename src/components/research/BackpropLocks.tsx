import { useCallback, useEffect, useRef, useState, type JSX } from 'react';

export type BackpropLock = 'weightTransport' | 'updateLocking' | 'twoPhases';

export interface BackpropLocksLabels {
  helpText?: string;
  forwardLabel?: string;
  backwardLabel?: string;
  weightTransportLabel?: string;
  updateLockingLabel?: string;
  twoPhasesLabel?: string;
  localModeLabel?: string;
  verdictLocal?: string;
  verdictGlobal?: string;
  resetLabel?: string;
  runLabel?: string;
  idleLabel?: string;
  svgLabel?: string;
}

export interface BackpropLocksProps {
  layers?: number;
  labels?: BackpropLocksLabels;
}

type Phase = 'idle' | 'forward' | 'backward' | 'localPulse';

interface AnimState {
  phase: Phase;
  activeCol: number;
  pulsingCols: Set<number>;
}

const NEURONS_PER_LAYER = [2, 3, 3, 1];
const STEP_MS = 350;
const PULSE_MS = 180;

const SVG_W = 360;
const SVG_H = 200;
const PAD_X = 36;
const PAD_Y = 28;
const R = 11;

function colX(col: number, totalCols: number): number {
  return PAD_X + (col * (SVG_W - 2 * PAD_X)) / (totalCols - 1);
}

function rowY(row: number, totalRows: number): number {
  if (totalRows === 1) return SVG_H / 2;
  return PAD_Y + (row * (SVG_H - 2 * PAD_Y)) / (totalRows - 1);
}

export default function BackpropLocks({ layers = 4, labels = {} }: BackpropLocksProps): JSX.Element {
  const helpText =
    labels.helpText ??
    "Lance un cycle d'apprentissage. En mode global, l'erreur balaie le réseau en arrière. Active le mode local pour voir les trois verrous disparaître.";
  const forwardLabel = labels.forwardLabel ?? 'Passe avant';
  const backwardLabel = labels.backwardLabel ?? 'Passe arrière';
  const weightTransportLabel = labels.weightTransportLabel ?? 'Transport de poids';
  const updateLockingLabel = labels.updateLockingLabel ?? 'Verrouillage des mises à jour';
  const twoPhasesLabel = labels.twoPhasesLabel ?? 'Deux phases séparées';
  const localModeLabel = labels.localModeLabel ?? 'Mode local';
  const verdictLocal =
    labels.verdictLocal ?? 'Règle locale : chaque couche se met à jour avec sa seule information.';
  const verdictGlobal =
    labels.verdictGlobal ??
    "Rétropropagation : non locale, elle exige un signal d'erreur global.";
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';
  const runLabel = labels.runLabel ?? 'Lancer';
  const idleLabel = labels.idleLabel ?? 'En attente';
  const svgLabel = labels.svgLabel ?? 'Réseau de neurones en couches';

  const neuronCounts: number[] = [];
  for (let i = 0; i < layers; i += 1) {
    neuronCounts.push(NEURONS_PER_LAYER[i % NEURONS_PER_LAYER.length]);
  }

  const [localMode, setLocalMode] = useState<boolean>(false);
  const [activeLocks, setActiveLocks] = useState<Set<BackpropLock>>(
    new Set(['weightTransport', 'updateLocking', 'twoPhases']),
  );
  const [anim, setAnim] = useState<AnimState>({
    phase: 'idle',
    activeCol: -1,
    pulsingCols: new Set(),
  });
  const [running, setRunning] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const reset = useCallback((): void => {
    clearTimer();
    setRunning(false);
    setAnim({ phase: 'idle', activeCol: -1, pulsingCols: new Set() });
  }, [clearTimer]);

  const toggleLock = useCallback((lock: BackpropLock): void => {
    setActiveLocks((prev) => {
      const next = new Set(prev);
      if (next.has(lock)) {
        next.delete(lock);
      } else {
        next.add(lock);
      }
      return next;
    });
  }, []);

  const runCycle = useCallback((): void => {
    if (running) return;
    clearTimer();
    setRunning(true);
    setAnim({ phase: 'forward', activeCol: 0, pulsingCols: new Set() });

    let col = 0;
    const totalCols = layers;

    const stepForward = (): void => {
      if (col >= totalCols) {
        if (localMode) {
          setAnim({ phase: 'idle', activeCol: -1, pulsingCols: new Set() });
          setRunning(false);
          return;
        }
        col = totalCols - 1;
        setAnim({ phase: 'backward', activeCol: col, pulsingCols: new Set() });
        timerRef.current = setTimeout(stepBackward, STEP_MS);
        return;
      }
      if (localMode) {
        const pulsingCol = col;
        setAnim({ phase: 'localPulse', activeCol: pulsingCol, pulsingCols: new Set([pulsingCol]) });
        timerRef.current = setTimeout(() => {
          setAnim((prev) => {
            const next = new Set(prev.pulsingCols);
            next.delete(pulsingCol);
            return { ...prev, pulsingCols: next };
          });
          col += 1;
          if (col < totalCols) {
            setAnim({ phase: 'forward', activeCol: col, pulsingCols: new Set() });
            timerRef.current = setTimeout(stepForward, STEP_MS);
          } else {
            setAnim({ phase: 'idle', activeCol: -1, pulsingCols: new Set() });
            setRunning(false);
          }
        }, PULSE_MS);
        return;
      }
      setAnim({ phase: 'forward', activeCol: col, pulsingCols: new Set() });
      col += 1;
      timerRef.current = setTimeout(stepForward, STEP_MS);
    };

    const stepBackward = (): void => {
      if (col < 0) {
        setAnim({ phase: 'idle', activeCol: -1, pulsingCols: new Set() });
        setRunning(false);
        return;
      }
      setAnim({ phase: 'backward', activeCol: col, pulsingCols: new Set() });
      col -= 1;
      timerRef.current = setTimeout(stepBackward, STEP_MS);
    };

    timerRef.current = setTimeout(stepForward, STEP_MS);
  }, [running, clearTimer, layers, localMode]);

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const lockDefs: { key: BackpropLock; label: string }[] = [
    { key: 'weightTransport', label: weightTransportLabel },
    { key: 'updateLocking', label: updateLockingLabel },
    { key: 'twoPhases', label: twoPhasesLabel },
  ];

  const svgDescription = `${svgLabel}. ${anim.phase === 'forward' ? forwardLabel : anim.phase === 'backward' ? backwardLabel : idleLabel}`;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label={svgDescription}
          className="w-full max-w-[360px] self-center"
        >
          {Array.from({ length: layers - 1 }, (_, ci) => {
            const x1 = colX(ci, layers);
            const x2 = colX(ci + 1, layers);
            const count1 = neuronCounts[ci];
            const count2 = neuronCounts[ci + 1];
            return Array.from({ length: count1 }, (_, ri) => {
              const y1 = rowY(ri, count1);
              return Array.from({ length: count2 }, (__, rj) => {
                const y2 = rowY(rj, count2);
                const isActiveEdge =
                  (anim.phase === 'forward' && anim.activeCol === ci + 1) ||
                  (anim.phase === 'backward' && anim.activeCol === ci);
                return (
                  <line
                    key={`e-${ci}-${ri}-${rj}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={
                      isActiveEdge && !localMode
                        ? 'var(--color-accent)'
                        : 'var(--color-line-strong)'
                    }
                    strokeWidth={isActiveEdge && !localMode ? 2 : 1}
                    strokeOpacity={isActiveEdge && !localMode ? 1 : 0.45}
                  />
                );
              });
            });
          })}

          {Array.from({ length: layers }, (_, ci) => {
            const x = colX(ci, layers);
            const count = neuronCounts[ci];
            const isForwardActive = anim.phase === 'forward' && anim.activeCol === ci;
            const isBackwardActive = anim.phase === 'backward' && anim.activeCol === ci;
            const isPulsing = anim.pulsingCols.has(ci);
            const isFirst = ci === 0;
            const isLast = ci === layers - 1;
            return Array.from({ length: count }, (_, ri) => {
              const y = rowY(ri, count);
              let stroke = 'var(--color-fg-muted)';
              if (isFirst || isLast) stroke = 'var(--color-fg)';
              if (isForwardActive) stroke = 'var(--color-accent)';
              if (isBackwardActive && !localMode) stroke = 'var(--color-accent)';
              if (isPulsing) stroke = 'var(--color-accent)';
              const strokeWidth = isForwardActive || isBackwardActive || isPulsing ? 2.5 : 1.5;
              const fill =
                isPulsing
                  ? 'var(--color-accent)'
                  : isForwardActive || isBackwardActive
                    ? 'var(--color-bg-elevated)'
                    : 'var(--color-bg)';
              return (
                <circle
                  key={`n-${ci}-${ri}`}
                  cx={x}
                  cy={y}
                  r={R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{ transition: 'stroke 0.15s, fill 0.15s' }}
                />
              );
            });
          })}

          {anim.phase === 'forward' && (
            <text
              x={colX(anim.activeCol, layers)}
              y={SVG_H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-accent)"
              fontFamily="monospace"
            >
              {forwardLabel}
            </text>
          )}
          {anim.phase === 'backward' && !localMode && (
            <text
              x={colX(anim.activeCol, layers)}
              y={SVG_H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-accent)"
              fontFamily="monospace"
            >
              {backwardLabel}
            </text>
          )}
        </svg>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={runCycle}
            disabled={running}
            aria-label={runLabel}
          >
            {running
              ? anim.phase === 'backward'
                ? backwardLabel
                : forwardLabel
              : runLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={reset}
            aria-label={resetLabel}
          >
            {resetLabel}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={localMode}
            aria-label={localModeLabel}
            onClick={() => {
              reset();
              setLocalMode((v) => !v);
            }}
            className={[
              buttonClass,
              localMode
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : '',
            ].join(' ')}
          >
            {localModeLabel}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {lockDefs.map(({ key, label }) => {
            const isActive = activeLocks.has(key);
            const isHighlighted = !localMode && isActive;
            return (
              <button
                key={key}
                type="button"
                role="checkbox"
                aria-checked={isActive}
                aria-label={label}
                onClick={() => toggleLock(key)}
                className={[
                  'flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] transition-colors duration-200 text-left',
                  isHighlighted
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : localMode
                      ? 'border-[var(--color-line)] text-[var(--color-fg-dim)] opacity-40 cursor-not-allowed'
                      : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)]',
                ].join(' ')}
                disabled={localMode}
              >
                <span
                  className="inline-block w-3 h-3 rounded-[2px] border flex-shrink-0"
                  style={{
                    borderColor: isHighlighted
                      ? 'var(--color-accent)'
                      : 'var(--color-line-strong)',
                    background: isHighlighted ? 'var(--color-accent)' : 'transparent',
                  }}
                  aria-hidden="true"
                />
                {label}
              </button>
            );
          })}
        </div>

        <p
          role="status"
          aria-live="polite"
          className="font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg-muted)] border-t border-[var(--color-line)] pt-3"
        >
          {localMode ? verdictLocal : verdictGlobal}
        </p>
      </div>
    </figure>
  );
}
