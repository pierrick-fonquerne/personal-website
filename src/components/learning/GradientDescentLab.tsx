import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  classifyRegime,
  parabolaTrajectory,
  ravineLoss,
  ravineTrajectory,
  type DescentRegime,
  type Point2D,
  type RavineShape,
} from './gradient-descent/descentLogic';

type Locale = 'fr' | 'en';
type Mode = 'parabola' | 'ravine';

interface GradientDescentLabProps {
  locale?: Locale;
  defaultMode?: Mode;
  defaultLearningRate?: number;
}

interface Dictionary {
  readonly title: string;
  readonly parabolaMode: string;
  readonly ravineMode: string;
  readonly learningRate: string;
  readonly step: string;
  readonly run: string;
  readonly pause: string;
  readonly reset: string;
  readonly iteration: string;
  readonly weight: string;
  readonly loss: string;
  readonly regime: string;
  readonly position: string;
  readonly parabolaDiagram: string;
  readonly ravineDiagram: string;
  readonly ravineHint: string;
  readonly regimes: Record<DescentRegime, string>;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Laboratoire de descente de gradient',
    parabolaMode: 'Parabole',
    ravineMode: 'Ravine',
    learningRate: 'Taux d’apprentissage η',
    step: 'Pas',
    run: 'Lancer',
    pause: 'Pause',
    reset: 'Réinitialiser',
    iteration: 'Itération',
    weight: 'Poids w',
    loss: 'Coût',
    regime: 'Régime',
    position: 'Position (x, y)',
    parabolaDiagram: 'Courbe du coût L = w² et trajectoire de la descente',
    ravineDiagram: 'Lignes de niveau d’une ravine et trajectoire en zigzag de la descente',
    ravineHint:
      'La ravine est raide en y et plate en x : le même η fait zigzaguer sur l’axe raide et avancer lentement sur l’axe plat.',
    regimes: {
      monotone: 'converge sans osciller',
      'one-step': 'converge en un seul pas',
      oscillating: 'oscille mais converge',
      cycling: 'rebondit sans fin',
      diverging: 'diverge',
    },
  },
  en: {
    title: 'Gradient descent lab',
    parabolaMode: 'Parabola',
    ravineMode: 'Ravine',
    learningRate: 'Learning rate η',
    step: 'Step',
    run: 'Run',
    pause: 'Pause',
    reset: 'Reset',
    iteration: 'Iteration',
    weight: 'Weight w',
    loss: 'Loss',
    regime: 'Regime',
    position: 'Position (x, y)',
    parabolaDiagram: 'Loss curve L = w² and the path of the descent',
    ravineDiagram: 'Contour lines of a ravine and the zigzag path of the descent',
    ravineHint:
      'The ravine is steep in y and flat in x: the same η makes the path zigzag across the steep axis and crawl along the flat one.',
    regimes: {
      monotone: 'converges smoothly',
      'one-step': 'converges in a single step',
      oscillating: 'oscillates but converges',
      cycling: 'bounces forever',
      diverging: 'diverges',
    },
  },
};

const PARABOLA_CURVATURE = 1;
const PARABOLA_START = 2;
const PARABOLA_DEFAULT_RATE = 0.1;
const PARABOLA_MAX_RATE = 1.2;
const RAVINE_SHAPE: RavineShape = { curvatureX: 1, curvatureY: 10 };
const RAVINE_START: Point2D = { x: 2, y: 1 };
const RAVINE_DEFAULT_RATE = 0.09;
const RAVINE_MAX_RATE = 0.12;
const MIN_RATE = 0.01;
const MAX_ITERATIONS = 30;
const DIVERGENCE_LIMIT = 50;
const RUN_INTERVAL_MILLISECONDS = 400;

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 240;
const PADDING = 24;
const WEIGHT_LIMIT = 3;
const LOSS_LIMIT = 9;
const RAVINE_PIXELS_PER_X = 55;
const RAVINE_PIXELS_PER_Y = 90;
const LEVEL_VALUES: readonly number[] = [0.5, 2, 4, 8, 14];

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function formatNumber(value: number, locale: Locale): string {
  const rounded = Number(value.toFixed(2));
  const text = String(Object.is(rounded, -0) ? 0 : rounded);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

function weightToX(weight: number): number {
  const ratio = (clamp(weight, -WEIGHT_LIMIT, WEIGHT_LIMIT) + WEIGHT_LIMIT) / (2 * WEIGHT_LIMIT);
  return PADDING + ratio * (VIEW_WIDTH - 2 * PADDING);
}

function lossToY(loss: number): number {
  const ratio = clamp(loss, 0, LOSS_LIMIT) / LOSS_LIMIT;
  return VIEW_HEIGHT - PADDING - ratio * (VIEW_HEIGHT - 2 * PADDING);
}

function ravineToX(x: number): number {
  return VIEW_WIDTH / 2 + clamp(x, -50, 50) * RAVINE_PIXELS_PER_X;
}

function ravineToY(y: number): number {
  return VIEW_HEIGHT / 2 - clamp(y, -50, 50) * RAVINE_PIXELS_PER_Y;
}

function buildCurvePath(): string {
  const segments: string[] = [];
  const sampleCount = 60;
  for (let index = 0; index <= sampleCount; index += 1) {
    const weight = -WEIGHT_LIMIT + (index / sampleCount) * 2 * WEIGHT_LIMIT;
    const command = index === 0 ? 'M' : 'L';
    segments.push(`${command}${weightToX(weight).toFixed(1)},${lossToY(weight * weight).toFixed(1)}`);
  }
  return segments.join(' ');
}

const CURVE_PATH = buildCurvePath();

function toPolyline(points: readonly { readonly x: number; readonly y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

const buttonStyle = {
  padding: '6px 12px',
  background: 'var(--bg-primary, #0f0f1a)',
  color: 'var(--text-primary, #e2e8f0)',
  border: '1px solid var(--border, #2d2d50)',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
} as const;

export default function GradientDescentLab({
  locale = 'fr',
  defaultMode = 'parabola',
  defaultLearningRate,
}: GradientDescentLabProps): JSX.Element {
  const labels = DICT[locale];
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [learningRate, setLearningRate] = useState<number>(() => {
    const fallback = defaultMode === 'ravine' ? RAVINE_DEFAULT_RATE : PARABOLA_DEFAULT_RATE;
    const maximum = defaultMode === 'ravine' ? RAVINE_MAX_RATE : PARABOLA_MAX_RATE;
    return clamp(defaultLearningRate ?? fallback, MIN_RATE, maximum);
  });
  const [iteration, setIteration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const isRavine = mode === 'ravine';
  const maxRate = isRavine ? RAVINE_MAX_RATE : PARABOLA_MAX_RATE;

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
  const regime = classifyRegime(PARABOLA_CURVATURE, learningRate);

  const hasDiverged = isRavine
    ? Math.abs(currentRavine.x) > DIVERGENCE_LIMIT || Math.abs(currentRavine.y) > DIVERGENCE_LIMIT
    : Math.abs(currentParabola.weight) > DIVERGENCE_LIMIT;
  const isFinished = iteration >= MAX_ITERATIONS || hasDiverged;

  useEffect(() => {
    if (!isRunning) return undefined;
    if (isFinished) {
      setIsRunning(false);
      return undefined;
    }
    const timerId = window.setInterval(() => {
      setIteration((previous) => previous + 1);
    }, RUN_INTERVAL_MILLISECONDS);
    return () => window.clearInterval(timerId);
  }, [isRunning, isFinished]);

  const restart = (): void => {
    setIteration(0);
    setIsRunning(false);
  };

  const changeMode = (nextMode: Mode): void => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setLearningRate(
      nextMode === 'ravine'
        ? RAVINE_DEFAULT_RATE
        : clamp(defaultLearningRate ?? PARABOLA_DEFAULT_RATE, MIN_RATE, PARABOLA_MAX_RATE),
    );
    restart();
  };

  const changeLearningRate = (value: number): void => {
    setLearningRate(clamp(value, MIN_RATE, maxRate));
    restart();
  };

  const modeButtonStyle = (isActive: boolean): typeof buttonStyle & { borderColor: string } => ({
    ...buttonStyle,
    borderColor: isActive ? 'var(--accent-violet, #a78bfa)' : 'var(--border, #2d2d50)',
  });

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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
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
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--bg-primary, #0f0f1a)" rx={10} />
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
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--bg-primary, #0f0f1a)" rx={10} />
            <line
              x1={PADDING}
              y1={lossToY(0)}
              x2={VIEW_WIDTH - PADDING}
              y2={lossToY(0)}
              stroke="var(--border, #2d2d50)"
            />
            <path d={CURVE_PATH} fill="none" stroke="var(--accent-green, #4ade80)" strokeWidth={2} />
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
            <text x={VIEW_WIDTH - PADDING - 8} y={VIEW_HEIGHT - 7} fill="var(--text-muted, #64748b)" fontSize={10}>
              w
            </text>
            <text x={6} y={PADDING + 4} fill="var(--text-muted, #64748b)" fontSize={10}>
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
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
          {labels.learningRate} = {formatNumber(learningRate, locale)}
          <input
            type="range"
            data-testid="descent-learning-rate"
            min={MIN_RATE}
            max={maxRate}
            step={0.01}
            value={learningRate}
            onChange={(event) => changeLearningRate(Number(event.target.value))}
            style={{ display: 'block', width: '100%', marginTop: '6px' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="descent-step"
            style={buttonStyle}
            disabled={isFinished}
            onClick={() => setIteration((previous) => previous + 1)}
          >
            {labels.step}
          </button>
          <button
            type="button"
            data-testid="descent-run"
            style={buttonStyle}
            disabled={isFinished && !isRunning}
            onClick={() => setIsRunning((previous) => !previous)}
          >
            {isRunning ? labels.pause : labels.run}
          </button>
          <button type="button" data-testid="descent-reset" style={buttonStyle} onClick={restart}>
            {labels.reset}
          </button>
        </div>
        <div
          aria-live="polite"
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
            <span data-testid="descent-iteration" style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {iteration}
            </span>
          </div>
          {isRavine ? (
            <>
              <div>
                {labels.position} ={' '}
                <span data-testid="descent-position" style={{ color: 'var(--accent-violet, #a78bfa)' }}>
                  ({formatNumber(currentRavine.x, locale)}, {formatNumber(currentRavine.y, locale)})
                </span>
              </div>
              <div>
                {labels.loss} ={' '}
                <span style={{ color: 'var(--accent-orange, #fb923c)', fontWeight: 700 }}>
                  {formatNumber(ravineLoss(RAVINE_SHAPE, currentRavine), locale)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                {labels.weight} ={' '}
                <span data-testid="descent-weight" style={{ color: 'var(--accent-violet, #a78bfa)' }}>
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
                <span data-testid="descent-regime" style={{ color: 'var(--accent-green, #4ade80)' }}>
                  {labels.regimes[regime]}
                </span>
              </div>
            </>
          )}
        </div>
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
