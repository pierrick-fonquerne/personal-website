import { useState, type JSX } from 'react';

export interface PredictiveCodingLabels {
  helpText?: string;
  predictLabel?: string;
  observeLabel?: string;
  surpriseLabel?: string;
  highSurprise?: string;
  lowSurprise?: string;
  iterateLabel?: string;
  resetLabel?: string;
}

export interface PredictiveCodingLoopProps {
  initialPrediction?: number;
  surpriseThreshold?: number;
  labels?: PredictiveCodingLabels;
}

const LEARNING_RATE = 0.5;
const AXIS_WIDTH = 320;
const AXIS_HEIGHT = 48;
const MARKER_HALF = 10;
const INSET = 12;

export default function PredictiveCodingLoop({
  initialPrediction = 0.5,
  surpriseThreshold = 0.2,
  labels = {},
}: PredictiveCodingLoopProps): JSX.Element {
  const [prediction, setPrediction] = useState<number>(initialPrediction);
  const [observation, setObservation] = useState<number>(0.5);

  const surprise = Math.abs(observation - prediction);
  const isHighSurprise = surprise > surpriseThreshold;

  const helpText =
    labels.helpText ??
    "Règle l'observation, puis itère. Le réseau apprend en réduisant l'écart entre ce qu'il prédit et ce qu'il observe.";
  const predictLabel = labels.predictLabel ?? 'Prédiction';
  const observeLabel = labels.observeLabel ?? 'Observation';
  const surpriseLabel = labels.surpriseLabel ?? 'Surprise';
  const highSurpriseLabel =
    labels.highSurprise ?? 'Surprise forte : modifier le réseau';
  const lowSurpriseLabel =
    labels.lowSurprise ?? 'Surprise faible : renforcer le modèle';
  const iterateLabel = labels.iterateLabel ?? 'Itérer';
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';

  const handleIterate = (): void => {
    setPrediction((prev) => prev + LEARNING_RATE * (observation - prev));
  };

  const handleReset = (): void => {
    setPrediction(initialPrediction);
    setObservation(0.5);
  };

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const predX = INSET + prediction * (AXIS_WIDTH - 2 * INSET);
  const obsX = INSET + observation * (AXIS_WIDTH - 2 * INSET);
  const bandLeft = Math.min(predX, obsX);
  const bandWidth = Math.abs(obsX - predX);
  const midY = AXIS_HEIGHT / 2;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

        <div className="w-full overflow-x-auto">
          <svg
            width={AXIS_WIDTH}
            height={AXIS_HEIGHT + 20}
            viewBox={`0 0 ${AXIS_WIDTH} ${AXIS_HEIGHT + 20}`}
            role="img"
            aria-label={`${predictLabel}: ${prediction.toFixed(2)}, ${observeLabel}: ${observation.toFixed(2)}, ${surpriseLabel}: ${surprise.toFixed(2)}`}
            className="w-full max-w-[320px]"
          >
            <line
              x1={0}
              y1={midY}
              x2={AXIS_WIDTH}
              y2={midY}
              stroke="var(--color-line-strong)"
              strokeWidth={1.5}
            />
            <text x={0} y={AXIS_HEIGHT + 16} fontSize={10} fill="var(--color-fg-dim)" fontFamily="monospace">0</text>
            <text x={AXIS_WIDTH} y={AXIS_HEIGHT + 16} fontSize={10} fill="var(--color-fg-dim)" fontFamily="monospace" textAnchor="end">1</text>

            {bandWidth > 0 && (
              <rect
                x={bandLeft}
                y={midY - 6}
                width={bandWidth}
                height={12}
                fill="var(--color-accent)"
                opacity={0.25}
              />
            )}

            <polygon
              points={`${predX},${midY - MARKER_HALF} ${predX - 7},${midY + MARKER_HALF} ${predX + 7},${midY + MARKER_HALF}`}
              fill="var(--color-fg-muted)"
              aria-label={`${predictLabel}: ${prediction.toFixed(2)}`}
            />

            <circle
              cx={obsX}
              cy={midY}
              r={9}
              fill="var(--color-bg)"
              stroke="var(--color-accent)"
              strokeWidth={2}
              aria-label={`${observeLabel}: ${observation.toFixed(2)}`}
            />

            {prediction <= 0.08 && (
              <text x={predX + 10} y={midY - 14} fontSize={9} fill="var(--color-fg-dim)" fontFamily="monospace">{predictLabel}</text>
            )}
            {prediction > 0.08 && (
              <text x={predX} y={midY - 16} fontSize={9} fill="var(--color-fg-dim)" fontFamily="monospace" textAnchor="middle">{predictLabel}</text>
            )}
            {observation >= 0.92 && (
              <text x={obsX - 10} y={midY + 24} fontSize={9} fill="var(--color-fg-dim)" fontFamily="monospace" textAnchor="end">{observeLabel}</text>
            )}
            {observation < 0.92 && (
              <text x={obsX} y={midY + 24} fontSize={9} fill="var(--color-fg-dim)" fontFamily="monospace" textAnchor="middle">{observeLabel}</text>
            )}
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="observation-slider"
            className="font-mono text-[12px] tracking-[0.06em] uppercase text-[var(--color-fg-dim)]"
          >
            {observeLabel}
          </label>
          <input
            id="observation-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={observation}
            onChange={(e) => setObservation(parseFloat(e.target.value))}
            aria-label={observeLabel}
            aria-valuenow={observation}
            aria-valuemin={0}
            aria-valuemax={1}
            className="w-full max-w-[320px] accent-[var(--color-accent)]"
          />
        </div>

        <div
          className="font-mono text-[13px] leading-[1.4]"
          style={{ color: isHighSurprise ? 'var(--color-accent)' : 'var(--color-fg-muted)' }}
          role="status"
          aria-live="polite"
        >
          {isHighSurprise ? highSurpriseLabel : lowSurpriseLabel}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={handleIterate}
            aria-label={iterateLabel}
          >
            {iterateLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={handleReset}
            aria-label={resetLabel}
          >
            {resetLabel}
          </button>
        </div>

        <dl className="flex flex-wrap gap-6 font-mono text-[12px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase">
          <div className="flex items-baseline gap-2">
            <dt>{predictLabel}</dt>
            <dd className="text-[16px] text-[var(--color-fg)]">{prediction.toFixed(2)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>{observeLabel}</dt>
            <dd className="text-[16px] text-[var(--color-fg)]">{observation.toFixed(2)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>{surpriseLabel}</dt>
            <dd
              className="text-[16px]"
              style={{ color: isHighSurprise ? 'var(--color-accent)' : 'var(--color-fg)' }}
            >
              {surprise.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>
    </figure>
  );
}
