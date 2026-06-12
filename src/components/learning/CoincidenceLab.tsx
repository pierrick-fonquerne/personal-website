import { useMemo, useState, type JSX } from 'react';
import {
  simulate,
  buildTwoPulseInput,
  peakOfTwoPulses,
  coincidenceWindow,
  type MembraneParams,
} from './coincidence/coincidence';

type Locale = 'fr' | 'en';

interface CoincidenceLabProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly delayLabel: string;
  readonly leakLabel: string;
  readonly thresholdLabel: string;
  readonly peak: string;
  readonly fired: string;
  readonly silent: string;
  readonly window: string;
  readonly windowNever: string;
  readonly windowAlways: string;
  readonly thresholdTick: string;
  readonly pulses: string;
  readonly spikeMark: string;
  readonly steps: string;
  readonly potential: string;
  readonly aria: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Un neurone qui entend le temps',
    delayLabel: 'Délai entre les deux entrées (Δ)',
    leakLabel: 'Rétention (mémoire de la membrane)',
    thresholdLabel: 'Seuil de décharge',
    peak: 'Potentiel maximal atteint',
    fired: 'Le neurone décharge',
    silent: 'Le neurone reste silencieux',
    window: 'Décharge tant que Δ ne dépasse pas',
    windowNever: 'Ces deux entrées ne suffisent jamais',
    windowAlways: 'Une seule entrée suffit déjà',
    thresholdTick: 'seuil',
    pulses: 'entrées',
    spikeMark: 'décharge',
    steps: 'temps (pas)',
    potential: 'potentiel',
    aria: 'Potentiel de membrane dans le temps, avec deux entrées et un seuil de décharge',
  },
  en: {
    title: 'A neuron that hears time',
    delayLabel: 'Delay between the two inputs (Δ)',
    leakLabel: 'Retention (membrane memory)',
    thresholdLabel: 'Firing threshold',
    peak: 'Peak potential reached',
    fired: 'The neuron fires',
    silent: 'The neuron stays silent',
    window: 'Fires as long as Δ does not exceed',
    windowNever: 'These two inputs are never enough',
    windowAlways: 'A single input already suffices',
    thresholdTick: 'threshold',
    pulses: 'inputs',
    spikeMark: 'spike',
    steps: 'time (steps)',
    potential: 'potential',
    aria: 'Membrane potential over time, with two inputs and a firing threshold',
  },
};

const STEPS = 16;
const FIRST_AT = 2;
const CHARGE = 0.6;

const VW = 360;
const VH = 240;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 18;
const PAD_B = 28;

function formatNum(n: number, locale: Locale, digits = 2): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

export default function CoincidenceLab({ locale = 'fr' }: CoincidenceLabProps): JSX.Element {
  const t = DICT[locale];

  const [delay, setDelay] = useState<number>(0);
  const [leak, setLeak] = useState<number>(0.7);
  const [threshold, setThreshold] = useState<number>(0.9);

  const params = useMemo<MembraneParams>(() => ({ leak, threshold }), [leak, threshold]);

  const input = useMemo(
    () => buildTwoPulseInput(STEPS, FIRST_AT, delay, CHARGE),
    [delay],
  );
  const { potential, spikeSteps } = useMemo(() => simulate(params, input), [params, input]);

  const peak = peakOfTwoPulses(params, CHARGE, delay);
  const fired = spikeSteps.length > 0;
  const window = coincidenceWindow(params, CHARGE);

  const yHi = Math.max(threshold * 1.25, 2 * CHARGE * 1.15, 1.3);

  const toX = (step: number): number =>
    PAD_L + (step / (STEPS - 1)) * (VW - PAD_L - PAD_R);
  const toY = (v: number): number =>
    VH - PAD_B - (Math.min(v, yHi) / yHi) * (VH - PAD_T - PAD_B);

  const potentialPath = potential
    .map((v, step) => `${step === 0 ? 'M' : 'L'}${toX(step).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');

  const pulseSteps = [FIRST_AT, FIRST_AT + delay].filter((s) => s < STEPS);

  let windowText: string;
  if (window === Infinity) {
    windowText = t.windowAlways;
  } else if (window < 0) {
    windowText = t.windowNever;
  } else {
    windowText = `${t.window} ${window}`;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: '24px',
        alignItems: 'start',
        padding: '20px',
        background: 'var(--bg-secondary, #14142a)',
        border: '1px solid var(--border, #2d2d50)',
        borderRadius: '12px',
        margin: '24px 0',
      }}
    >
      <div>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={t.aria}
        >
          <rect width={VW} height={VH} fill="var(--bg-primary, #0f0f1a)" rx={10} />

          {/* Axes */}
          <line
            x1={PAD_L}
            y1={PAD_T - 2}
            x2={PAD_L}
            y2={VH - PAD_B}
            stroke="var(--border, #2d2d50)"
            strokeWidth={1}
          />
          <line
            x1={PAD_L}
            y1={VH - PAD_B}
            x2={VW - PAD_R}
            y2={VH - PAD_B}
            stroke="var(--border, #2d2d50)"
            strokeWidth={1}
          />

          {/* Threshold line */}
          <line
            x1={PAD_L}
            y1={toY(threshold)}
            x2={VW - PAD_R}
            y2={toY(threshold)}
            stroke="var(--accent-orange, #fb923c)"
            strokeWidth={1.4}
            strokeDasharray="5 3"
          />
          <text
            x={VW - PAD_R}
            y={toY(threshold) - 4}
            fill="var(--accent-orange, #fb923c)"
            fontSize={9}
            textAnchor="end"
          >
            {t.thresholdTick} = {formatNum(threshold, locale)}
          </text>

          {/* Input pulses as upward ticks on the time axis */}
          {pulseSteps.map((s, i) => (
            <g key={`pulse-${i}`}>
              <line
                x1={toX(s)}
                y1={VH - PAD_B}
                x2={toX(s)}
                y2={VH - PAD_B - 10}
                stroke="var(--accent-violet, #a78bfa)"
                strokeWidth={2}
              />
              <circle cx={toX(s)} cy={VH - PAD_B - 12} r={2.5} fill="var(--accent-violet, #a78bfa)" />
            </g>
          ))}

          {/* Potential trace */}
          <path
            d={potentialPath}
            fill="none"
            stroke="var(--accent-green, #4ade80)"
            strokeWidth={2}
          />
          {potential.map((v, step) => (
            <circle
              key={`pt-${step}`}
              cx={toX(step)}
              cy={toY(v)}
              r={1.8}
              fill="var(--accent-green, #4ade80)"
            />
          ))}

          {/* Spike markers */}
          {spikeSteps.map((s) => (
            <g key={`spike-${s}`}>
              <circle
                cx={toX(s)}
                cy={toY(potential[s] ?? threshold)}
                r={5}
                fill="none"
                stroke="var(--accent-orange, #fb923c)"
                strokeWidth={2}
              />
              <text
                x={toX(s)}
                y={toY(potential[s] ?? threshold) - 9}
                fill="var(--accent-orange, #fb923c)"
                fontSize={9}
                textAnchor="middle"
              >
                {t.spikeMark}
              </text>
            </g>
          ))}

          {/* Axis captions */}
          <text x={PAD_L - 6} y={PAD_T + 4} fill="var(--text-muted, #64748b)" fontSize={9} textAnchor="end">
            {t.potential}
          </text>
          <text
            x={VW - PAD_R}
            y={VH - 6}
            fill="var(--text-muted, #64748b)"
            fontSize={9}
            textAnchor="end"
          >
            {t.steps}
          </text>
        </svg>
      </div>

      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary, #e2e8f0)',
            marginTop: 0,
            marginBottom: '14px',
          }}
        >
          {t.title}
        </h3>

        {/* Slider: delay */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.delayLabel} :{' '}
            <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>{delay}</strong>
          </label>
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={delay}
            onChange={(e) => setDelay(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
          />
        </div>

        {/* Slider: leak */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.leakLabel} :{' '}
            <strong style={{ color: 'var(--accent-green, #4ade80)' }}>
              {formatNum(leak, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={leak}
            onChange={(e) => setLeak(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-green, #4ade80)' }}
          />
        </div>

        {/* Slider: threshold */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.thresholdLabel} :{' '}
            <strong style={{ color: 'var(--accent-orange, #fb923c)' }}>
              {formatNum(threshold, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-orange, #fb923c)' }}
          />
        </div>

        {/* Readout panel */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.8,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.peak} : </span>
            <span style={{ color: 'var(--accent-green, #4ade80)' }}>
              {formatNum(peak, locale)}
            </span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              marginTop: '6px',
              paddingTop: '6px',
              fontWeight: 700,
              color: fired ? 'var(--accent-orange, #fb923c)' : 'var(--text-muted, #64748b)',
            }}
          >
            {fired ? t.fired : t.silent}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px' }}>{windowText}</div>
        </div>
      </div>
    </div>
  );
}
