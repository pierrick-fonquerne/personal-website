import { useMemo, useState, type JSX } from 'react';

export interface PoorVsRichLabels {
  helpText?: string;
  poorLabel?: string;
  richLabel?: string;
  potentialLabel?: string;
  thresholdLabel?: string;
  energyLabel?: string;
  injectLabel?: string;
  resetLabel?: string;
  spikeLabel?: string;
}

export interface PoorVsRichNeuronProps {
  leak?: number;
  threshold?: number;
  labels?: PoorVsRichLabels;
}

const N_STEPS = 24;
const PULSE_AMPLITUDE = 0.5;
const SVG_W = 340;
const SVG_H = 100;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;

type InputTrain = readonly number[];

interface RichState {
  potential: number;
  spikeCount: number;
  energy: number;
}

interface SimResult {
  poorOutputs: readonly number[];
  richPotentials: readonly number[];
  richSpikes: readonly boolean[];
  finalRich: RichState;
}

function simulate(
  train: InputTrain,
  leak: number,
  threshold: number,
): SimResult {
  const poorOutputs: number[] = [];
  const richPotentials: number[] = [];
  const richSpikes: boolean[] = [];

  let v = 0;
  let spikeCount = 0;
  let energy = 0;

  for (let k = 0; k < N_STEPS; k += 1) {
    const input = train[k] ?? 0;

    const poorOut = input >= threshold ? 1 : 0;
    poorOutputs.push(poorOut);

    v = v * (1 - leak) + input;
    const fired = v >= threshold;
    richSpikes.push(fired);
    if (fired) {
      richPotentials.push(threshold);
      spikeCount += 1;
      energy += threshold;
      v = 0;
    } else {
      richPotentials.push(v);
    }
  }

  return {
    poorOutputs,
    richPotentials,
    richSpikes,
    finalRich: { potential: v, spikeCount, energy },
  };
}

function stepX(step: number): number {
  const usable = SVG_W - PAD_LEFT - PAD_RIGHT;
  return PAD_LEFT + (step / (N_STEPS - 1)) * usable;
}

function valY(value: number, maxVal: number): number {
  const usable = SVG_H - PAD_TOP - PAD_BOTTOM;
  const clamped = Math.min(Math.max(value, 0), maxVal);
  return SVG_H - PAD_BOTTOM - (clamped / maxVal) * usable;
}

interface PlotProps {
  values: readonly number[];
  spikes: readonly boolean[];
  maxVal: number;
  threshold: number | null;
  thresholdLabel: string;
  spikeLabel: string;
  ariaLabel: string;
  accentSpikes: boolean;
}

function NeuronPlot({
  values,
  spikes,
  maxVal,
  threshold,
  thresholdLabel,
  spikeLabel,
  ariaLabel,
  accentSpikes,
}: PlotProps): JSX.Element {
  const points = values
    .map((v, k) => `${stepX(k).toFixed(1)},${valY(v, maxVal).toFixed(1)}`)
    .join(' ');

  const threshY = threshold !== null ? valY(threshold, maxVal) : null;

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      role="img"
      aria-label={ariaLabel}
      className="w-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-fg-muted)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {threshY !== null && (
        <>
          <line
            x1={PAD_LEFT}
            y1={threshY}
            x2={SVG_W - PAD_RIGHT}
            y2={threshY}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={SVG_W - PAD_RIGHT - 2}
            y={threshY - 3}
            fontSize={9}
            fill="var(--color-accent)"
            textAnchor="end"
          >
            {thresholdLabel}
          </text>
        </>
      )}

      {spikes.map((fired, k) => {
        if (!fired) return null;
        const cx = stepX(k);
        const cy = valY(values[k] ?? 0, maxVal);
        return (
          <g key={k} aria-label={spikeLabel}>
            <circle
              cx={cx}
              cy={cy}
              r={4}
              fill={accentSpikes ? 'var(--color-accent)' : 'var(--color-fg-muted)'}
              stroke="var(--color-bg-elevated)"
              strokeWidth={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function PoorVsRichNeuron({
  leak = 0.2,
  threshold = 1.0,
  labels = {},
}: PoorVsRichNeuronProps): JSX.Element {
  const helpText =
    labels.helpText ??
    "Injecte des impulsions trop faibles pour declencher seules. Le neurone pauvre ne voit que l'instant et ne reagit jamais. Le neurone riche integre dans le temps et finit par decharger.";
  const poorLabel = labels.poorLabel ?? 'Neurone pauvre (sans etat)';
  const richLabel = labels.richLabel ?? 'Neurone riche (potentiel, fuite, seuil)';
  const potentialLabel = labels.potentialLabel ?? 'Potentiel';
  const thresholdLabel = labels.thresholdLabel ?? 'Seuil';
  const energyLabel = labels.energyLabel ?? 'Energie';
  const injectLabel = labels.injectLabel ?? 'Injecter une impulsion';
  const resetLabel = labels.resetLabel ?? 'Reinitialiser';
  const spikeLabel = labels.spikeLabel ?? 'Decharge';

  const [train, setTrain] = useState<readonly number[]>(
    () => Array<number>(N_STEPS).fill(0),
  );
  const [nextStep, setNextStep] = useState<number>(0);

  const result = useMemo(
    () => simulate(train, leak, threshold),
    [train, leak, threshold],
  );

  const maxRich = Math.max(threshold * 1.2, ...result.richPotentials, 0.01);

  const inject = (): void => {
    if (nextStep >= N_STEPS) return;
    setTrain((prev) => {
      const next = [...prev];
      next[nextStep] = PULSE_AMPLITUDE;
      return next;
    });
    setNextStep((s) => Math.min(s + 1, N_STEPS));
  };

  const reset = (): void => {
    setTrain(Array<number>(N_STEPS).fill(0));
    setNextStep(0);
  };

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const poorAriaLabel = `${poorLabel} - ${N_STEPS} pas de temps, aucun spike detecte avec amplitude ${PULSE_AMPLITUDE}`;
  const richAriaLabel = `${richLabel} - potentiel courant: ${result.finalRich.potential.toFixed(2)}, decharges: ${result.finalRich.spikeCount}`;

  const pulseCount = train.filter((v) => v > 0).length;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <p className="mb-4 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={inject}
          disabled={nextStep >= N_STEPS}
          aria-label={injectLabel}
        >
          {injectLabel}
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

      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-fg-dim)]">
          {poorLabel}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-fg-dim)]">
          {pulseCount} impulsion{pulseCount !== 1 ? 's' : ''} - pas de spike
        </span>
      </div>

      <div className="mb-4 overflow-hidden rounded-sm border border-[var(--color-line)] bg-[var(--color-bg)]">
        <NeuronPlot
          values={result.poorOutputs}
          spikes={result.poorOutputs.map(() => false)}
          maxVal={1.2}
          threshold={null}
          thresholdLabel={thresholdLabel}
          spikeLabel={spikeLabel}
          ariaLabel={poorAriaLabel}
          accentSpikes={false}
        />
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-fg-dim)]">
          {richLabel}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-accent)]">
          {result.finalRich.spikeCount} {spikeLabel.toLowerCase()}{result.finalRich.spikeCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mb-4 overflow-hidden rounded-sm border border-[var(--color-line)] bg-[var(--color-bg)]">
        <NeuronPlot
          values={result.richPotentials}
          spikes={result.richSpikes}
          maxVal={maxRich}
          threshold={threshold}
          thresholdLabel={thresholdLabel}
          spikeLabel={spikeLabel}
          ariaLabel={richAriaLabel}
          accentSpikes={true}
        />
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase">
        <div className="flex items-baseline gap-2">
          <dt>{potentialLabel}</dt>
          <dd className="text-[14px] normal-case text-[var(--color-fg)]">
            {result.finalRich.potential.toFixed(3)}
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt>{thresholdLabel}</dt>
          <dd className="text-[14px] normal-case text-[var(--color-fg)]">
            {threshold.toFixed(2)}
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt>{energyLabel}</dt>
          <dd className="text-[14px] normal-case text-[var(--color-fg)]">
            {result.finalRich.energy.toFixed(2)}
          </dd>
        </div>
      </dl>
    </figure>
  );
}
