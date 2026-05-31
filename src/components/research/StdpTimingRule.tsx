import { useMemo, useState, type JSX } from 'react';

export interface StdpTimingLabels {
  helpText?: string;
  preLabel?: string;
  postLabel?: string;
  beforeLabel?: string;
  deltaTLabel?: string;
  weightChangeLabel?: string;
  potentiationLabel?: string;
  depressionLabel?: string;
  thirdFactorLabel?: string;
  firePreLabel?: string;
  firePostLabel?: string;
  resetLabel?: string;
  deliverRewardLabel?: string;
  eligibilityLabel?: string;
  consolidatedWeightLabel?: string;
  currentWeightLabel?: string;
}

export interface StdpTimingRuleProps {
  tauMs?: number;
  thirdFactor?: boolean;
  labels?: StdpTimingLabels;
}

const RANGE = 50;
const SVG_W = 360;
const SVG_H = 220;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;
const APLUS = 1;
const AMINUS = 1;

function computeDw(dt: number, tau: number): number {
  if (dt === 0) return 0;
  if (dt > 0) return APLUS * Math.exp(-dt / tau);
  return -AMINUS * Math.exp(dt / tau);
}

function dtToX(dt: number): number {
  return PAD_L + ((dt + RANGE) / (2 * RANGE)) * PLOT_W;
}

function dwToY(dw: number): number {
  return PAD_T + ((1 - dw) / 2) * PLOT_H;
}

function buildCurvePath(tau: number): string {
  const points: string[] = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const dt = -RANGE + (i / steps) * 2 * RANGE;
    const dw = computeDw(dt, tau);
    const x = dtToX(dt);
    const y = dwToY(dw);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

const INITIAL_WEIGHT = 0.5;

export default function StdpTimingRule({
  tauMs = 20,
  thirdFactor: thirdFactorProp = false,
  labels = {},
}: StdpTimingRuleProps): JSX.Element {
  const [dt, setDt] = useState<number>(20);
  const [weight, setWeight] = useState<number>(INITIAL_WEIGHT);
  const [eligibility, setEligibility] = useState<number>(0);
  const [thirdFactor, setThirdFactor] = useState<boolean>(thirdFactorProp);

  const helpText =
    labels.helpText ??
    "Règle la différence de timing entre les deux décharges. La synapse se renforce si la pré décharge avant la post, s'affaiblit sinon. Tout est local : seul le timing relatif compte.";
  const preLabel = labels.preLabel ?? 'Pré-synaptique';
  const postLabel = labels.postLabel ?? 'Post-synaptique';
  const beforeLabel = labels.beforeLabel ?? 'avant';
  const deltaTLabel = labels.deltaTLabel ?? 'Différence de timing';
  const weightChangeLabel = labels.weightChangeLabel ?? 'Variation du poids';
  const potentiationLabel = labels.potentiationLabel ?? 'Potentiation : la synapse se renforce';
  const depressionLabel = labels.depressionLabel ?? "Dépression : la synapse s'affaiblit";
  const thirdFactorLabel = labels.thirdFactorLabel ?? 'Troisième facteur (récompense)';
  const firePreLabel = labels.firePreLabel ?? 'Décharge pré';
  const firePostLabel = labels.firePostLabel ?? 'Décharge post';
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';
  const deliverRewardLabel = labels.deliverRewardLabel ?? 'Délivrer la récompense';
  const eligibilityLabel = labels.eligibilityLabel ?? 'Trace éligibilité';
  const currentWeightLabel = labels.currentWeightLabel ?? 'Poids courant';

  const tau = tauMs;

  const dw = useMemo(() => computeDw(dt, tau), [dt, tau]);
  const curvePath = useMemo(() => buildCurvePath(tau), [tau]);

  const clampWeight = (w: number): number => Math.min(1, Math.max(0, w));

  const applyDw = (currentDw: number): void => {
    if (!thirdFactor) {
      setWeight((prev) => clampWeight(prev + currentDw * 0.1));
    } else {
      setEligibility(currentDw);
    }
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = Number(e.target.value);
    setDt(value);
  };

  const handleFirePre = (): void => {
    setDt(20);
    applyDw(computeDw(20, tau));
  };

  const handleFirePost = (): void => {
    setDt(-20);
    applyDw(computeDw(-20, tau));
  };

  const handleApplyFromSlider = (): void => {
    applyDw(dw);
  };

  const handleDeliverReward = (): void => {
    setWeight((prev) => clampWeight(prev + eligibility * 0.1));
    setEligibility(0);
  };

  const handleReset = (): void => {
    setDt(20);
    setWeight(INITIAL_WEIGHT);
    setEligibility(0);
  };

  const dotX = dtToX(dt);
  const dotY = dwToY(dw);

  const isPotentiation = dw > 0;
  const isDepression = dw < 0;

  const verdictColor = isPotentiation
    ? 'var(--color-accent)'
    : isDepression
      ? 'var(--color-fg-muted)'
      : 'var(--color-fg-dim)';
  const verdictText = isPotentiation
    ? potentiationLabel
    : isDepression
      ? depressionLabel
      : '';

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const svgDescription = `Courbe STDP : variation de poids en fonction de delta_t de ${-RANGE} à +${RANGE} ms. Point courant : delta_t = ${dt} ms, dw = ${dw.toFixed(2)}.`;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="grid items-start gap-6 sm:grid-cols-[360px_1fr]">
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label={svgDescription}
          className="w-full max-w-[360px]"
        >
          <line
            x1={PAD_L}
            y1={dwToY(0)}
            x2={PAD_L + PLOT_W}
            y2={dwToY(0)}
            stroke="var(--color-line)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <line
            x1={dtToX(0)}
            y1={PAD_T}
            x2={dtToX(0)}
            y2={PAD_T + PLOT_H}
            stroke="var(--color-line)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + PLOT_H}
            stroke="var(--color-line-strong)"
            strokeWidth={1.5}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + PLOT_H}
            x2={PAD_L + PLOT_W}
            y2={PAD_T + PLOT_H}
            stroke="var(--color-line-strong)"
            strokeWidth={1.5}
          />
          <text
            x={PAD_L - 6}
            y={dwToY(1) + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            +1
          </text>
          <text
            x={PAD_L - 6}
            y={dwToY(0) + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            0
          </text>
          <text
            x={PAD_L - 6}
            y={dwToY(-1) + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            -1
          </text>
          <text
            x={dtToX(-RANGE)}
            y={PAD_T + PLOT_H + 14}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            -{RANGE}
          </text>
          <text
            x={dtToX(0)}
            y={PAD_T + PLOT_H + 14}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            0
          </text>
          <text
            x={dtToX(RANGE)}
            y={PAD_T + PLOT_H + 14}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            +{RANGE}
          </text>
          <text
            x={PAD_L + PLOT_W / 2}
            y={SVG_H - 2}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-fg-dim)"
          >
            {'Δ'}t (ms)
          </text>
          <text
            x={8}
            y={PAD_T + PLOT_H / 2}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-fg-dim)"
            transform={`rotate(-90, 8, ${PAD_T + PLOT_H / 2})`}
          >
            dw
          </text>
          <clipPath id="stdp-clip">
            <rect x={dtToX(-RANGE)} y={PAD_T} width={PLOT_W} height={PLOT_H} />
          </clipPath>
          <path
            d={curvePath}
            fill="none"
            stroke="var(--color-fg-muted)"
            strokeWidth={2}
            clipPath="url(#stdp-clip)"
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={6}
            fill="var(--color-accent)"
            stroke="var(--color-bg-elevated)"
            strokeWidth={2}
          />
        </svg>

        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="stdp-slider"
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-fg-dim)]"
            >
              {deltaTLabel} : <span className="text-[var(--color-fg)]">{dt} ms</span>
            </label>
            <input
              id="stdp-slider"
              type="range"
              min={-RANGE}
              max={RANGE}
              step={1}
              value={dt}
              onChange={handleSlider}
              aria-label={deltaTLabel}
              aria-valuenow={dt}
              aria-valuemin={-RANGE}
              aria-valuemax={RANGE}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between font-mono text-[10px] text-[var(--color-fg-dim)]">
              <span>{preLabel} {beforeLabel}</span>
              <span>{beforeLabel} {postLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={handleFirePre}
              aria-label={`${firePreLabel} : delta_t = +20 ms`}
            >
              {firePreLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={handleFirePost}
              aria-label={`${firePostLabel} : delta_t = -20 ms`}
            >
              {firePostLabel}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={handleApplyFromSlider}
              aria-label={weightChangeLabel}
            >
              {weightChangeLabel}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="stdp-third-factor"
              type="checkbox"
              checked={thirdFactor}
              onChange={(e) => {
                setThirdFactor(e.target.checked);
                setEligibility(0);
              }}
              className="accent-[var(--color-accent)]"
            />
            <label
              htmlFor="stdp-third-factor"
              className="text-[13px] text-[var(--color-fg-muted)]"
            >
              {thirdFactorLabel}
            </label>
          </div>

          {thirdFactor && (
            <button
              type="button"
              className={buttonClass}
              onClick={handleDeliverReward}
              disabled={eligibility === 0}
              aria-label={deliverRewardLabel}
            >
              {deliverRewardLabel}
            </button>
          )}

          <dl className="flex flex-col gap-1 font-mono text-[12px] tracking-[0.04em]">
            <div className="flex items-baseline gap-2">
              <dt className="uppercase text-[10px] tracking-[0.06em] text-[var(--color-fg-dim)]">
                {'Δ'}t
              </dt>
              <dd className="text-[15px] text-[var(--color-fg)]">{dt} ms</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="uppercase text-[10px] tracking-[0.06em] text-[var(--color-fg-dim)]">
                dw
              </dt>
              <dd className="text-[15px] text-[var(--color-fg)]">{dw.toFixed(2)}</dd>
            </div>
            {thirdFactor && (
              <div className="flex items-baseline gap-2">
                <dt className="uppercase text-[10px] tracking-[0.06em] text-[var(--color-fg-dim)]">
                  {eligibilityLabel}
                </dt>
                <dd className="text-[15px] text-[var(--color-fg)]">{eligibility.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <dt className="uppercase text-[10px] tracking-[0.06em] text-[var(--color-fg-dim)]">
                {currentWeightLabel}
              </dt>
              <dd className="text-[15px] text-[var(--color-fg)]">{weight.toFixed(3)}</dd>
            </div>
          </dl>

          {verdictText && (
            <p
              className="text-[13px] leading-[1.4]"
              style={{ color: verdictColor }}
            >
              {verdictText}
            </p>
          )}

          <button
            type="button"
            className={buttonClass}
            onClick={handleReset}
            aria-label={resetLabel}
          >
            {resetLabel}
          </button>
        </div>
      </div>
    </figure>
  );
}
