import { useState, type JSX } from 'react';
import {
  timeConstant,
  decay,
  lambdaFromStep,
  sampleRecurrence,
  type RcParams,
} from './membrane-rc/membrane-rc';

type Locale = 'fr' | 'en';

interface MembraneRcLabProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly resistanceLabel: string;
  readonly capacitanceLabel: string;
  readonly stepLabel: string;
  readonly tauReadout: string;
  readonly lambdaReadout: string;
  readonly remainingNote: string;
  readonly continuousLegend: string;
  readonly discreteLegend: string;
  readonly tauTick: string;
  readonly remainingTick: string;
  readonly potential: string;
  readonly time: string;
  readonly aria: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'La fuite vient de la physique',
    resistanceLabel: 'Résistance R (les canaux laissent fuir)',
    capacitanceLabel: 'Capacité C (la membrane stocke)',
    stepLabel: 'Pas d’échantillonnage Δt',
    tauReadout: 'Constante de temps τ = R · C',
    lambdaReadout: 'Rétention par pas λ = e^(−Δt/τ)',
    remainingNote: 'À t = τ, il reste 37 % de la charge (63 % a fui).',
    continuousLegend: 'décharge continue',
    discreteLegend: 'récurrence (pas Δt)',
    tauTick: 'τ',
    remainingTick: '37 %',
    potential: 'potentiel',
    time: 'temps',
    aria: 'Décharge du potentiel de membrane : courbe continue et points discrets échantillonnés tous les Δt, avec le repère de la constante de temps',
  },
  en: {
    title: 'The leak comes from physics',
    resistanceLabel: 'Resistance R (channels let charge leak)',
    capacitanceLabel: 'Capacitance C (the membrane stores)',
    stepLabel: 'Sampling step Δt',
    tauReadout: 'Time constant τ = R · C',
    lambdaReadout: 'Retention per step λ = e^(−Δt/τ)',
    remainingNote: 'At t = τ, 37% of the charge remains (63% has leaked).',
    continuousLegend: 'continuous decay',
    discreteLegend: 'recurrence (step Δt)',
    tauTick: 'τ',
    remainingTick: '37%',
    potential: 'potential',
    time: 'time',
    aria: 'Membrane potential decay: continuous curve and discrete points sampled every Δt, with the time-constant marker',
  },
};

const T_MAX = 10;
const V0 = 1;
const CURVE_SAMPLES = 140;
const MAX_DOTS = 60;

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

export default function MembraneRcLab({ locale = 'fr' }: MembraneRcLabProps): JSX.Element {
  const t = DICT[locale];

  const [resistance, setResistance] = useState<number>(2);
  const [capacitance, setCapacitance] = useState<number>(1);
  const [step, setStep] = useState<number>(0.5);

  const params: RcParams = { resistance, capacitance };
  const tau = timeConstant(params);
  const lambda = lambdaFromStep(step, tau);

  const yHi = V0 * 1.1;

  const toX = (time: number): number => PAD_L + (time / T_MAX) * (VW - PAD_L - PAD_R);
  const toY = (v: number): number =>
    VH - PAD_B - (Math.min(v, yHi) / yHi) * (VH - PAD_T - PAD_B);

  const curveSegments: string[] = [];
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const time = (i / CURVE_SAMPLES) * T_MAX;
    const v = decay(V0, time, tau);
    curveSegments.push(`${i === 0 ? 'M' : 'L'}${toX(time).toFixed(1)},${toY(v).toFixed(1)}`);
  }
  const continuousPath = curveSegments.join(' ');

  const dotCount = Math.min(MAX_DOTS, Math.floor(T_MAX / step) + 1);
  const discrete = sampleRecurrence(V0, lambda, dotCount);
  const tauInRange = tau <= T_MAX;

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

          {/* 37% remaining guide (1/e of the initial charge) */}
          <line
            x1={PAD_L}
            y1={toY(V0 * Math.exp(-1))}
            x2={VW - PAD_R}
            y2={toY(V0 * Math.exp(-1))}
            stroke="var(--accent-orange, #fb923c)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
          <text
            x={PAD_L + 4}
            y={toY(V0 * Math.exp(-1)) - 4}
            fill="var(--accent-orange, #fb923c)"
            fontSize={9}
            textAnchor="start"
          >
            {t.remainingTick}
          </text>

          {/* tau vertical marker */}
          {tauInRange && (
            <>
              <line
                x1={toX(tau)}
                y1={PAD_T - 2}
                x2={toX(tau)}
                y2={VH - PAD_B}
                stroke="var(--accent-orange, #fb923c)"
                strokeWidth={1.4}
                strokeDasharray="5 3"
              />
              <text
                x={toX(tau)}
                y={PAD_T + 4}
                fill="var(--accent-orange, #fb923c)"
                fontSize={9}
                textAnchor="middle"
              >
                {t.tauTick} = {formatNum(tau, locale)}
              </text>
            </>
          )}

          {/* Continuous decay curve */}
          <path
            d={continuousPath}
            fill="none"
            stroke="var(--accent-green, #4ade80)"
            strokeWidth={2}
          />

          {/* Discrete recurrence samples sitting on the curve */}
          {discrete.map((v, k) => (
            <circle
              key={`dot-${k}`}
              cx={toX(k * step)}
              cy={toY(v)}
              r={2.6}
              fill="var(--accent-violet, #a78bfa)"
              stroke="var(--bg-primary, #0f0f1a)"
              strokeWidth={0.6}
            />
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
            {t.time}
          </text>
        </svg>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '18px',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '16px',
                height: '2px',
                background: 'var(--accent-green, #4ade80)',
                display: 'inline-block',
              }}
            />
            {t.continuousLegend}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-violet, #a78bfa)',
                display: 'inline-block',
              }}
            />
            {t.discreteLegend}
          </span>
        </div>
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

        {/* Slider: resistance */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.resistanceLabel} :{' '}
            <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(resistance, locale, 1)}
            </strong>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={resistance}
            onChange={(e) => setResistance(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
          />
        </div>

        {/* Slider: capacitance */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.capacitanceLabel} :{' '}
            <strong style={{ color: 'var(--accent-green, #4ade80)' }}>
              {formatNum(capacitance, locale, 2)}
            </strong>
          </label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={capacitance}
            onChange={(e) => setCapacitance(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-green, #4ade80)' }}
          />
        </div>

        {/* Slider: sampling step */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.stepLabel} :{' '}
            <strong style={{ color: 'var(--accent-orange, #fb923c)' }}>
              {formatNum(step, locale, 2)}
            </strong>
          </label>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={step}
            onChange={(e) => setStep(parseFloat(e.target.value))}
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
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.tauReadout} : </span>
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>{formatNum(tau, locale)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.lambdaReadout} : </span>
            <span style={{ color: 'var(--accent-green, #4ade80)' }}>{formatNum(lambda, locale)}</span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              marginTop: '6px',
              paddingTop: '6px',
              fontSize: '11px',
            }}
          >
            {t.remainingNote}
          </div>
        </div>
      </div>
    </div>
  );
}
