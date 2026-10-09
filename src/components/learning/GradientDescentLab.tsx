import { useId, useMemo, useState, type CSSProperties, type JSX } from 'react';
import {
  DIVERGENCE_LIMIT,
  MAX_ITERATIONS,
  MIN_RATE,
  RATE_STEP,
  classifyRavine,
  classifyRegime,
  clamp,
  getInitialRate,
  getMaxRate,
  parabolaTrajectory,
  ravineLoss,
  ravineTrajectory,
  type DescentMode,
  type Point2D,
  type RavineShape,
} from './gradient-descent/descentLogic';
import { DICTIONARY_BY_LOCALE } from './gradient-descent/descentDictionary';
import {
  CURVE_PATH,
  LEVEL_VALUES,
  PADDING,
  RAVINE_PIXELS_PER_X,
  RAVINE_PIXELS_PER_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  formatNumber,
  lossToY,
  ravineToX,
  ravineToY,
  toPolyline,
  weightToX,
  type Locale,
} from './gradient-descent/descentProjection';
import { useDescentRunner } from './gradient-descent/useDescentRunner';

interface GradientDescentLabProps {
  locale?: Locale;
  defaultMode?: DescentMode;
  defaultLearningRate?: number;
}

const PARABOLA_CURVATURE = 1;
const PARABOLA_START = 2;
const RAVINE_SHAPE: RavineShape = { curvatureX: 1, curvatureY: 10 };
const RAVINE_START: Point2D = { x: 2, y: 1 };

const buttonStyle: CSSProperties = {
  padding: '6px 12px',
  background: 'var(--bg-primary, #0f0f1a)',
  color: 'var(--text-primary, #e2e8f0)',
  border: '1px solid var(--border, #2d2d50)',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
};

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export default function GradientDescentLab({
  locale = 'fr',
  defaultMode = 'parabola',
  defaultLearningRate,
}: GradientDescentLabProps): JSX.Element {
  const labels = DICTIONARY_BY_LOCALE[locale];
  const [mode, setMode] = useState<DescentMode>(defaultMode);
  const [learningRate, setLearningRate] = useState<number>(() =>
    getInitialRate(defaultMode, defaultLearningRate),
  );
  const rateLabelId = useId();

  const isRavine = mode === 'ravine';
  const maxRate = getMaxRate(mode);

  const isDiverged = (candidateIteration: number): boolean => {
    if (isRavine) {
      const trajectory = ravineTrajectory(
        RAVINE_SHAPE,
        learningRate,
        RAVINE_START,
        candidateIteration,
      );
      const last = trajectory[trajectory.length - 1];
      return Math.abs(last.x) > DIVERGENCE_LIMIT || Math.abs(last.y) > DIVERGENCE_LIMIT;
    }
    const trajectory = parabolaTrajectory(
      PARABOLA_CURVATURE,
      learningRate,
      PARABOLA_START,
      candidateIteration,
    );
    return Math.abs(trajectory[trajectory.length - 1].weight) > DIVERGENCE_LIMIT;
  };

  const { iteration, isRunning, isFinished, step, toggle, restart } = useDescentRunner({
    maxIterations: MAX_ITERATIONS,
    isDiverged,
  });

  const parabolaPoints = useMemo(
    () => parabolaTrajectory(PARABOLA_CURVATURE, learningRate, PARABOLA_START, iteration),
    [learningRate, iteration],
  );
  const ravinePoints = useMemo(
    () => ravineTrajectory(RAVINE_SHAPE, learningRate, RAVINE_START, iteration),
    [learningRate, iteration],
  );

  const currentParabola = parabolaPoints[parabolaPoints.length - 1];
  const currentRavine = ravinePoints[ravinePoints.length - 1];
  const regime = isRavine ? null : classifyRegime(PARABOLA_CURVATURE, learningRate);
  const ravineBehavior = isRavine ? classifyRavine(RAVINE_SHAPE, learningRate) : null;

  const hasDiverged = isRavine
    ? Math.abs(currentRavine.x) > DIVERGENCE_LIMIT || Math.abs(currentRavine.y) > DIVERGENCE_LIMIT
    : Math.abs(currentParabola.weight) > DIVERGENCE_LIMIT;
  const stopMessage = !isFinished
    ? null
    : hasDiverged
      ? labels.divergenceReached
      : labels.iterationLimitReached;
  const behaviorLabel = isRavine
    ? labels.ravineBehaviors[ravineBehavior ?? 'smooth']
    : labels.regimes[regime ?? 'monotone'];
  const announcement = [
    `${isRavine ? labels.behavior : labels.regime} : ${behaviorLabel}`,
    stopMessage,
  ]
    .filter((part) => part !== null)
    .join('. ');

  const changeMode = (nextMode: DescentMode): void => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setLearningRate(
      getInitialRate(nextMode, nextMode === defaultMode ? defaultLearningRate : undefined),
    );
    restart();
  };

  const changeLearningRate = (value: number): void => {
    setLearningRate(clamp(value, MIN_RATE, maxRate));
    restart();
  };

  const modeButtonStyle = (isActive: boolean): CSSProperties => ({
    ...buttonStyle,
    borderColor: isActive ? 'var(--accent-violet, #a78bfa)' : 'var(--border, #2d2d50)',
    background: isActive ? 'rgba(167, 139, 250, 0.15)' : buttonStyle.background,
    fontWeight: isActive ? 600 : 400,
  });

  const actionButtonStyle = (isInactive: boolean): CSSProperties =>
    isInactive ? { ...buttonStyle, opacity: 0.5, cursor: 'not-allowed' } : buttonStyle;

  const parabolaScreenPoints = parabolaPoints.map((point) => ({
    x: weightToX(point.weight),
    y: lossToY(point.loss),
  }));
  const ravineScreenPoints = ravinePoints.map((point) => ({
    x: ravineToX(point.x),
    y: ravineToY(point.y),
  }));
  const lastParabolaScreenPoint = parabolaScreenPoints[parabolaScreenPoints.length - 1];
  const lastRavineScreenPoint = ravineScreenPoints[ravineScreenPoints.length - 1];

  const isRunInactive = isFinished && !isRunning;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
        {isRavine ? (
          <svg
            data-testid="descent-ravine-map"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label={labels.ravineDiagram}
          >
            <rect
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              fill="var(--bg-primary, #0f0f1a)"
              rx={10}
            />
            {LEVEL_VALUES.map((level) => (
              <ellipse
                key={level}
                cx={ravineToX(0)}
                cy={ravineToY(0)}
                rx={Math.sqrt(level / RAVINE_SHAPE.curvatureX) * RAVINE_PIXELS_PER_X}
                ry={Math.sqrt(level / RAVINE_SHAPE.curvatureY) * RAVINE_PIXELS_PER_Y}
                fill="none"
                stroke="var(--border, #2d2d50)"
                strokeWidth={1.5}
              />
            ))}
            <polyline
              points={toPolyline(ravineScreenPoints)}
              fill="none"
              stroke="var(--accent-orange, #fb923c)"
              strokeWidth={1.5}
            />
            {ravineScreenPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="var(--accent-orange, #fb923c)"
              />
            ))}
            <circle
              cx={lastRavineScreenPoint.x}
              cy={lastRavineScreenPoint.y}
              r={7}
              fill="none"
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={3}
            />
          </svg>
        ) : (
          <svg
            data-testid="descent-parabola-curve"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label={labels.parabolaDiagram}
          >
            <rect
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              fill="var(--bg-primary, #0f0f1a)"
              rx={10}
            />
            <line
              x1={PADDING}
              y1={lossToY(0)}
              x2={VIEW_WIDTH - PADDING}
              y2={lossToY(0)}
              stroke="var(--border, #2d2d50)"
            />
            <path
              d={CURVE_PATH}
              fill="none"
              stroke="var(--accent-green, #4ade80)"
              strokeWidth={2}
            />
            <polyline
              points={toPolyline(parabolaScreenPoints)}
              fill="none"
              stroke="var(--accent-orange, #fb923c)"
              strokeWidth={1.5}
            />
            {parabolaScreenPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="var(--accent-orange, #fb923c)"
              />
            ))}
            <circle
              cx={lastParabolaScreenPoint.x}
              cy={lastParabolaScreenPoint.y}
              r={7}
              fill="none"
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={3}
            />
            <text
              aria-hidden="true"
              x={VIEW_WIDTH - PADDING - 8}
              y={VIEW_HEIGHT - 7}
              fill="var(--text-muted, #64748b)"
              fontSize={10}
            >
              w
            </text>
            <text
              aria-hidden="true"
              x={6}
              y={PADDING + 4}
              fill="var(--text-muted, #64748b)"
              fontSize={10}
            >
              L
            </text>
          </svg>
        )}
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
          {labels.title}
        </h3>
        <div
          role="group"
          aria-label={labels.modeGroup}
          style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
        >
          <button
            type="button"
            data-testid="descent-mode-parabola"
            aria-pressed={!isRavine}
            style={modeButtonStyle(!isRavine)}
            onClick={() => changeMode('parabola')}
          >
            {labels.parabolaMode}
          </button>
          <button
            type="button"
            data-testid="descent-mode-ravine"
            aria-pressed={isRavine}
            style={modeButtonStyle(isRavine)}
            onClick={() => changeMode('ravine')}
          >
            {labels.ravineMode}
          </button>
        </div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '12px',
          }}
        >
          <span id={rateLabelId}>{labels.learningRate}</span> = {formatNumber(learningRate, locale)}
          <input
            type="range"
            data-testid="descent-learning-rate"
            aria-labelledby={rateLabelId}
            aria-valuetext={
              regime === null
                ? formatNumber(learningRate, locale)
                : `${formatNumber(learningRate, locale)} : ${labels.regimes[regime]}`
            }
            min={MIN_RATE}
            max={maxRate}
            step={RATE_STEP}
            value={learningRate}
            onChange={(event) => changeLearningRate(Number(event.target.value))}
            style={{ display: 'block', width: '100%', marginTop: '6px' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="descent-step"
            style={actionButtonStyle(isFinished)}
            aria-disabled={isFinished ? 'true' : undefined}
            onClick={step}
          >
            {labels.step}
          </button>
          <button
            type="button"
            data-testid="descent-run"
            style={actionButtonStyle(isRunInactive)}
            aria-disabled={isRunInactive ? 'true' : undefined}
            onClick={toggle}
          >
            {isRunning ? labels.pause : labels.run}
          </button>
          <button type="button" data-testid="descent-reset" style={buttonStyle} onClick={restart}>
            {labels.reset}
          </button>
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.9,
          }}
        >
          <div>
            {labels.iteration} :{' '}
            <span
              data-testid="descent-iteration"
              style={{ color: 'var(--accent-violet, #a78bfa)' }}
            >
              {iteration}
            </span>
          </div>
          {isRavine ? (
            <>
              <div>
                {labels.position} ={' '}
                <span
                  data-testid="descent-position"
                  style={{ color: 'var(--accent-violet, #a78bfa)' }}
                >
                  ({formatNumber(currentRavine.x, locale)}, {formatNumber(currentRavine.y, locale)})
                </span>
              </div>
              <div>
                {labels.loss} ={' '}
                <span style={{ color: 'var(--accent-orange, #fb923c)', fontWeight: 700 }}>
                  {formatNumber(ravineLoss(RAVINE_SHAPE, currentRavine), locale)}
                </span>
              </div>
              <div>
                {labels.behavior} :{' '}
                <span
                  data-testid="descent-ravine-status"
                  style={{ color: 'var(--accent-green, #4ade80)' }}
                >
                  {behaviorLabel}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                {labels.weight} ={' '}
                <span
                  data-testid="descent-weight"
                  style={{ color: 'var(--accent-violet, #a78bfa)' }}
                >
                  {formatNumber(currentParabola.weight, locale)}
                </span>
              </div>
              <div>
                {labels.loss} ={' '}
                <span style={{ color: 'var(--accent-orange, #fb923c)', fontWeight: 700 }}>
                  {formatNumber(currentParabola.loss, locale)}
                </span>
              </div>
              <div>
                {labels.regime} :{' '}
                <span
                  data-testid="descent-regime"
                  style={{ color: 'var(--accent-green, #4ade80)' }}
                >
                  {behaviorLabel}
                </span>
              </div>
            </>
          )}
        </div>
        <div role="status" style={visuallyHiddenStyle}>
          {announcement}
        </div>
        {stopMessage === null ? null : (
          <div
            data-testid="descent-stop-message"
            style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent-orange, #fb923c)' }}
          >
            {stopMessage}
          </div>
        )}
        {isRavine ? (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              background: 'rgba(74, 222, 128, 0.08)',
              borderLeft: '3px solid var(--accent-green, #4ade80)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              lineHeight: 1.6,
            }}
          >
            {labels.ravineHint}
          </div>
        ) : null}
      </div>
    </div>
  );
}
