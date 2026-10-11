import { useId, useMemo, useState, type CSSProperties, type JSX } from 'react';
import {
  CHECKPOINT_COUNT,
  DATASET_SEED,
  MAX_DEGREE,
  MAX_EPOCH,
  MIN_DEGREE,
  PENALTY_LEVELS,
  checkpointEpochs,
  classifyFit,
  createDataset,
  descentSnapshots,
  errorCurveOverPenalty,
  fitRidge,
  indexOfMinimum,
  meanSquaredError,
  safeLearningRate,
  type RegularizationMode,
} from './regularization/regularizationLogic';
import { DICTIONARY_BY_LOCALE } from './regularization/regularizationDictionary';
import {
  PADDING,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  buildErrorPath,
  buildFitPath,
  buildTargetPath,
  errorToPixelX,
  formatNumber,
  formatPenalty,
  xToPixel,
  yToPixel,
  type Locale,
} from './regularization/regularizationProjection';
import { useDescentRunner } from './gradient-descent/useDescentRunner';

interface RegularizationLabProps {
  locale: Locale;
  defaultMode?: RegularizationMode;
  defaultDegree?: number;
  defaultPenaltyIndex?: number;
}

const TARGET_PATH = buildTargetPath();

const responsiveStyles = `
.regularization-lab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.regularization-lab-panels { display: grid; gap: 16px; }
@media (max-width: 640px) { .regularization-lab-grid { grid-template-columns: 1fr; } }
`;

const buttonStyle: CSSProperties = {
  padding: '6px 12px',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  border: '1px solid var(--color-line-strong)',
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

const svgStyle: CSSProperties = { width: '100%', height: 'auto', display: 'block' };

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function neverDiverged(): boolean {
  return false;
}

export default function RegularizationLab({
  locale,
  defaultMode = 'penalty',
  defaultDegree = MAX_DEGREE,
  defaultPenaltyIndex = 0,
}: RegularizationLabProps): JSX.Element {
  const labels = DICTIONARY_BY_LOCALE[locale];
  const [mode, setMode] = useState<RegularizationMode>(defaultMode);
  const [degree, setDegree] = useState<number>(clampInteger(defaultDegree, MIN_DEGREE, MAX_DEGREE));
  const [penaltyIndex, setPenaltyIndex] = useState<number>(
    clampInteger(defaultPenaltyIndex, 0, PENALTY_LEVELS.length - 1),
  );
  const degreeLabelId = useId();
  const penaltyLabelId = useId();

  const isPenaltyMode = mode === 'penalty';

  const dataset = useMemo(() => createDataset(DATASET_SEED), []);
  const epochs = useMemo(() => checkpointEpochs(MAX_EPOCH, CHECKPOINT_COUNT), []);
  const snapshots = useMemo(
    () =>
      descentSnapshots(
        dataset,
        MAX_DEGREE,
        safeLearningRate(dataset.trainingSamples, MAX_DEGREE),
        epochs,
      ),
    [dataset, epochs],
  );
  const errorCurve = useMemo(
    () => errorCurveOverPenalty(dataset, degree, PENALTY_LEVELS),
    [dataset, degree],
  );

  const { iteration, isRunning, isFinished, step, toggle, restart } = useDescentRunner({
    maxIterations: epochs.length - 1,
    isDiverged: neverDiverged,
  });

  const penalty = PENALTY_LEVELS[penaltyIndex];
  const penaltyFit = useMemo(() => {
    const coefficients = fitRidge(dataset.trainingSamples, degree, penalty);
    return {
      coefficients,
      trainingError: meanSquaredError(coefficients, dataset.trainingSamples),
      validationError: meanSquaredError(coefficients, dataset.validationSamples),
    };
  }, [dataset, degree, penalty]);

  const currentSnapshot = snapshots[iteration];
  const current = isPenaltyMode ? penaltyFit : currentSnapshot;
  const diagnosis = classifyFit(current.trainingError, current.validationError);

  const bestPenaltyIndex = indexOfMinimum(errorCurve.map((point) => point.validationError));
  const bestSnapshotIndex = indexOfMinimum(snapshots.map((snapshot) => snapshot.validationError));
  const bestEpoch = epochs[bestSnapshotIndex];

  const trainingErrors = isPenaltyMode
    ? errorCurve.map((point) => point.trainingError)
    : snapshots.map((snapshot) => snapshot.trainingError);
  const validationErrors = isPenaltyMode
    ? errorCurve.map((point) => point.validationError)
    : snapshots.map((snapshot) => snapshot.validationError);
  const pointCount = trainingErrors.length;
  const currentMarkerIndex = isPenaltyMode ? penaltyIndex : iteration;
  const bestMarkerIndex = isPenaltyMode ? bestPenaltyIndex : bestSnapshotIndex;

  const announcement = isPenaltyMode
    ? `${labels.diagnosis} : ${labels.diagnoses[diagnosis]}`
    : `${labels.earlyStoppingMode}. ${labels.bestEpoch} : ${bestEpoch}`;

  const changeMode = (nextMode: RegularizationMode): void => {
    if (nextMode === mode) return;
    setMode(nextMode);
    restart();
  };

  const modeButtonStyle = (isActive: boolean): CSSProperties => ({
    ...buttonStyle,
    borderColor: isActive ? 'var(--color-accent)' : 'var(--color-line-strong)',
    background: isActive ? 'var(--color-hover)' : buttonStyle.background,
    fontWeight: isActive ? 600 : 400,
  });

  const actionButtonStyle = (isInactive: boolean): CSSProperties =>
    isInactive ? { ...buttonStyle, opacity: 0.5, cursor: 'not-allowed' } : buttonStyle;

  const isRunInactive = isFinished && !isRunning;
  const fitCoefficients = isPenaltyMode ? penaltyFit.coefficients : currentSnapshot.coefficients;
  const fitPath = buildFitPath(fitCoefficients);
  const errorsDiagram = isPenaltyMode ? labels.penaltyDiagram : labels.earlyStoppingDiagram;

  const valueStyle: CSSProperties = { color: 'var(--color-accent)' };
  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--color-fg-muted)',
    marginBottom: '12px',
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        margin: '24px 0',
      }}
    >
      <style>{responsiveStyles}</style>
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--color-fg)',
          marginTop: 0,
          marginBottom: '14px',
        }}
      >
        {labels.title}
      </h3>
      <div className="regularization-lab-grid">
        <div className="regularization-lab-panels">
          <svg
            data-testid="regularization-fit-plot"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            xmlns="http://www.w3.org/2000/svg"
            style={svgStyle}
            role="img"
            aria-label={labels.fitDiagram}
          >
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--color-bg)" rx={10} />
            <line
              x1={PADDING}
              y1={yToPixel(0)}
              x2={VIEW_WIDTH - PADDING}
              y2={yToPixel(0)}
              stroke="var(--color-line-strong)"
            />
            <path
              d={TARGET_PATH}
              fill="none"
              stroke="var(--color-fg-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <path d={fitPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
            {dataset.trainingSamples.map((sample) => (
              <circle
                key={sample.x}
                cx={xToPixel(sample.x)}
                cy={yToPixel(sample.y)}
                r={3.5}
                fill="var(--color-stage-prepa)"
              />
            ))}
          </svg>
          <svg
            data-testid="regularization-error-plot"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            xmlns="http://www.w3.org/2000/svg"
            style={svgStyle}
            role="img"
            aria-label={errorsDiagram}
          >
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--color-bg)" rx={10} />
            <line
              x1={errorToPixelX(bestMarkerIndex, pointCount)}
              y1={PADDING}
              x2={errorToPixelX(bestMarkerIndex, pointCount)}
              y2={VIEW_HEIGHT - PADDING}
              stroke="var(--color-success)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <line
              x1={errorToPixelX(currentMarkerIndex, pointCount)}
              y1={PADDING}
              x2={errorToPixelX(currentMarkerIndex, pointCount)}
              y2={VIEW_HEIGHT - PADDING}
              stroke="var(--color-fg-muted)"
              strokeWidth={1.5}
            />
            <path
              d={buildErrorPath(trainingErrors)}
              fill="none"
              stroke="var(--color-stage-prepa)"
              strokeWidth={2}
            />
            <path
              d={buildErrorPath(validationErrors)}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div>
          <div
            role="radiogroup"
            aria-label={labels.modeGroup}
            style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isPenaltyMode}
              data-testid="regularization-mode-penalty"
              style={modeButtonStyle(isPenaltyMode)}
              onClick={() => changeMode('penalty')}
            >
              {labels.penaltyMode}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!isPenaltyMode}
              data-testid="regularization-mode-early-stopping"
              style={modeButtonStyle(!isPenaltyMode)}
              onClick={() => changeMode('early-stopping')}
            >
              {labels.earlyStoppingMode}
            </button>
          </div>
          {isPenaltyMode ? (
            <>
              <label style={labelStyle}>
                <span id={degreeLabelId}>{labels.degree}</span> = {degree}
                <input
                  type="range"
                  data-testid="regularization-degree"
                  aria-labelledby={degreeLabelId}
                  min={MIN_DEGREE}
                  max={MAX_DEGREE}
                  step={1}
                  value={degree}
                  onChange={(event) =>
                    setDegree(clampInteger(Number(event.target.value), MIN_DEGREE, MAX_DEGREE))
                  }
                  style={{ display: 'block', width: '100%', marginTop: '6px' }}
                />
              </label>
              <label style={labelStyle}>
                <span id={penaltyLabelId}>{labels.penalty}</span> ={' '}
                <span data-testid="regularization-penalty-value">
                  {formatPenalty(penalty, locale)}
                </span>
                <input
                  type="range"
                  data-testid="regularization-penalty"
                  aria-labelledby={penaltyLabelId}
                  aria-valuetext={formatPenalty(penalty, locale)}
                  min={0}
                  max={PENALTY_LEVELS.length - 1}
                  step={1}
                  value={penaltyIndex}
                  onChange={(event) =>
                    setPenaltyIndex(
                      clampInteger(Number(event.target.value), 0, PENALTY_LEVELS.length - 1),
                    )
                  }
                  style={{ display: 'block', width: '100%', marginTop: '6px' }}
                />
              </label>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="regularization-step"
                style={actionButtonStyle(isFinished)}
                aria-disabled={isFinished ? 'true' : undefined}
                onClick={step}
              >
                {labels.step}
              </button>
              <button
                type="button"
                data-testid="regularization-run"
                style={actionButtonStyle(isRunInactive)}
                aria-disabled={isRunInactive ? 'true' : undefined}
                onClick={toggle}
              >
                {isRunning ? labels.pause : labels.run}
              </button>
              <button
                type="button"
                data-testid="regularization-reset"
                style={buttonStyle}
                onClick={restart}
              >
                {labels.reset}
              </button>
            </div>
          )}
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '13px',
              color: 'var(--color-fg-muted)',
              lineHeight: 1.9,
            }}
          >
            {isPenaltyMode ? (
              <div>
                {labels.bestPenalty} :{' '}
                <span data-testid="regularization-best-penalty" style={valueStyle}>
                  {formatPenalty(PENALTY_LEVELS[bestPenaltyIndex], locale)}
                </span>
              </div>
            ) : (
              <>
                <div>
                  {labels.epoch} :{' '}
                  <span data-testid="regularization-epoch" style={valueStyle}>
                    {epochs[iteration]}
                  </span>
                </div>
                <div>
                  {labels.bestEpoch} :{' '}
                  <span data-testid="regularization-best-epoch" style={valueStyle}>
                    {bestEpoch}
                  </span>
                </div>
              </>
            )}
            <div>
              {labels.trainingError} :{' '}
              <span data-testid="regularization-training-error" style={valueStyle}>
                {formatNumber(current.trainingError, locale)}
              </span>
            </div>
            <div>
              {labels.validationError} :{' '}
              <span data-testid="regularization-validation-error" style={valueStyle}>
                {formatNumber(current.validationError, locale)}
              </span>
            </div>
            <div>
              {labels.diagnosis} :{' '}
              <span
                data-testid="regularization-diagnosis"
                style={{ color: 'var(--color-success)' }}
              >
                {labels.diagnoses[diagnosis]}
              </span>
            </div>
          </div>
          <div role="status" style={visuallyHiddenStyle}>
            {announcement}
          </div>
        </div>
      </div>
    </div>
  );
}
