import { useId, useMemo, useState, type CSSProperties, type JSX } from 'react';
import {
  NETWORK_DEPTH,
  NETWORK_SEED,
  XOR_SEED,
  XOR_SNAPSHOT_COUNT,
  propagateThroughDepth,
  xorSnapshots,
  type Activation,
  type InitializationScheme,
  type LabMode,
  type LayerStatistics,
  type SymmetryStart,
} from './initialization/initializationLogic';
import { DICTIONARY_BY_LOCALE } from './initialization/initializationDictionary';
import {
  PADDING,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  barRectangle,
  formatNumber,
  formatScientific,
  hiddenLineSegment,
  layerToPixelX,
  unitToPixel,
  type Locale,
} from './initialization/initializationProjection';
import { useDescentRunner } from './gradient-descent/useDescentRunner';

interface InitializationLabProps {
  locale: Locale;
  defaultMode?: LabMode;
  defaultActivation?: Activation;
  defaultScheme?: InitializationScheme;
  defaultBatchNormalized?: boolean;
}

type DepthDiagnosis = 'exploding' | 'vanishing' | 'stable';

const ACTIVATIONS: readonly Activation[] = ['tanh', 'relu'];
const SCHEMES: readonly InitializationScheme[] = ['standard-normal', 'small', 'xavier', 'he'];
const STARTS: readonly SymmetryStart[] = ['twins', 'random'];
const EXPLOSION_RATIO = 10;
const VANISHING_RATIO = 0.1;
const TWIN_TOLERANCE = 1e-9;
const XOR_POINTS: ReadonlyArray<{ x: number; y: number; target: 0 | 1 }> = [
  { x: 0, y: 0, target: 0 },
  { x: 0, y: 1, target: 1 },
  { x: 1, y: 0, target: 1 },
  { x: 1, y: 1, target: 0 },
];
const POINT_RADIUS = 6;

const responsiveStyles = `
.initialization-lab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.initialization-lab-panels { display: grid; gap: 16px; }
.initialization-lab-grid > * { min-width: 0; }
@media (max-width: 640px) { .initialization-lab-grid { grid-template-columns: 1fr; } }
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

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
  flexWrap: 'wrap',
};

function neverDiverged(): boolean {
  return false;
}

function classifyDepth(layers: readonly LayerStatistics[]): DepthDiagnosis {
  const ratio =
    layers[layers.length - 1].activationStandardDeviation / layers[0].activationStandardDeviation;
  if (ratio > EXPLOSION_RATIO) return 'exploding';
  if (ratio < VANISHING_RATIO) return 'vanishing';
  return 'stable';
}

interface BarChartProps {
  testId: string;
  diagram: string;
  describedBy: string;
  axisLabel: string;
  values: readonly number[];
  color: string;
  locale: Locale;
  layerValueText: (layer: number, formattedValue: string) => string;
}

function BarChart({
  testId,
  diagram,
  describedBy,
  axisLabel,
  values,
  color,
  locale,
  layerValueText,
}: BarChartProps): JSX.Element {
  return (
    <svg
      data-testid={testId}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      style={svgStyle}
      role="group"
      aria-label={diagram}
      aria-describedby={describedBy}
    >
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--color-bg)" rx={10} />
      <line
        x1={PADDING}
        y1={VIEW_HEIGHT - PADDING}
        x2={VIEW_WIDTH - PADDING}
        y2={VIEW_HEIGHT - PADDING}
        stroke="var(--color-line-strong)"
      />
      {values.map((value, index) => {
        const layer = index + 1;
        const bar = barRectangle(layer, NETWORK_DEPTH, value);
        const spokenValue = layerValueText(layer, formatScientific(value, locale));
        return (
          <g key={layer} role="img" aria-label={spokenValue}>
            <title>{spokenValue}</title>
            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={color} />
            <text
              x={layerToPixelX(layer, NETWORK_DEPTH)}
              y={VIEW_HEIGHT - PADDING + 12}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-fg-muted)"
              aria-hidden="true"
            >
              {layer}
            </text>
          </g>
        );
      })}
      <text
        x={VIEW_WIDTH / 2}
        y={VIEW_HEIGHT - 4}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-fg-muted)"
      >
        {axisLabel}
      </text>
    </svg>
  );
}

export default function InitializationLab({
  locale,
  defaultMode = 'symmetry',
  defaultActivation = 'relu',
  defaultScheme = 'standard-normal',
  defaultBatchNormalized = false,
}: InitializationLabProps): JSX.Element {
  const labels = DICTIONARY_BY_LOCALE[locale];
  const [mode, setMode] = useState<LabMode>(defaultMode);
  const [start, setStart] = useState<SymmetryStart>('random');
  const [activation, setActivation] = useState<Activation>(defaultActivation);
  const [scheme, setScheme] = useState<InitializationScheme>(defaultScheme);
  const [isBatchNormalized, setIsBatchNormalized] = useState<boolean>(defaultBatchNormalized);
  const valuesId = useId();

  const isSymmetryMode = mode === 'symmetry';

  const snapshots = useMemo(() => xorSnapshots(start, XOR_SEED), [start]);
  const layers = useMemo(
    () => propagateThroughDepth({ activation, scheme, isBatchNormalized, seed: NETWORK_SEED }),
    [activation, scheme, isBatchNormalized],
  );

  const { iteration, isRunning, isFinished, step, toggle, restart } = useDescentRunner({
    maxIterations: XOR_SNAPSHOT_COUNT,
    isDiverged: neverDiverged,
  });

  const snapshot = snapshots[iteration];
  const depthDiagnosis = classifyDepth(layers);

  const isXorSolved = snapshot.predictions.every(
    (prediction, index) => Math.round(prediction) === XOR_POINTS[index].target,
  );
  let symmetryAnnouncement = '';
  if (isFinished) {
    if (snapshot.twinDistance < TWIN_TOLERANCE) symmetryAnnouncement = labels.twinsStuck;
    else if (isXorSolved) symmetryAnnouncement = labels.xorSolved;
  }
  const announcement = isSymmetryMode ? symmetryAnnouncement : labels[depthDiagnosis];

  const changeMode = (nextMode: LabMode): void => {
    if (nextMode === mode) return;
    setMode(nextMode);
    restart();
  };

  const changeStart = (nextStart: SymmetryStart): void => {
    if (nextStart === start) return;
    setStart(nextStart);
    restart();
  };

  const toggleButtonStyle = (isActive: boolean): CSSProperties => ({
    ...buttonStyle,
    borderColor: isActive ? 'var(--color-accent)' : 'var(--color-line-strong)',
    background: isActive ? 'var(--color-hover)' : buttonStyle.background,
    fontWeight: isActive ? 600 : 400,
  });

  const actionButtonStyle = (isInactive: boolean): CSSProperties =>
    isInactive ? { ...buttonStyle, opacity: 0.5, cursor: 'not-allowed' } : buttonStyle;

  const isRunInactive = isFinished && !isRunning;
  const valueStyle: CSSProperties = { color: 'var(--color-fg)', fontWeight: 600 };
  const groupLabelStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-fg-muted)',
    marginBottom: '6px',
  };

  const [firstHiddenLine, secondHiddenLine] = [0, 1].map((neuron) =>
    hiddenLineSegment(
      snapshot.network.hiddenWeights[neuron],
      snapshot.network.hiddenBiases[neuron],
    ),
  );
  const hiddenLines = [
    { segment: firstHiddenLine, color: 'var(--color-accent)', dash: undefined },
    { segment: secondHiddenLine, color: 'var(--color-success)', dash: '6 3' },
  ];
  const lowerLeft = unitToPixel({ x: 0, y: 0 });
  const upperRight = unitToPixel({ x: 1, y: 1 });

  const legendItems: ReadonlyArray<{ label: string; color: string; dash?: string }> = [
    { label: labels.legendTwinOne, color: 'var(--color-accent)' },
    { label: labels.legendTwinTwo, color: 'var(--color-success)', dash: '6 3' },
  ];

  const renderChoiceGroup = <Choice extends string>(
    groupLabel: string,
    choices: readonly Choice[],
    selected: Choice,
    onSelect: (choice: Choice) => void,
    testIdPrefix: string,
    choiceLabels: Record<Choice, string>,
  ): JSX.Element => (
    <div style={{ marginBottom: '12px' }}>
      <div role="group" aria-label={groupLabel} style={{ ...buttonRowStyle, marginBottom: 0 }}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={selected === choice}
            data-testid={`${testIdPrefix}-${choice}`}
            style={toggleButtonStyle(selected === choice)}
            onClick={() => onSelect(choice)}
          >
            {choiceLabels[choice]}
          </button>
        ))}
      </div>
    </div>
  );

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
      <div className="initialization-lab-grid">
        <div className="initialization-lab-panels">
          {isSymmetryMode ? (
            <>
              <svg
                data-testid="initialization-square"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                xmlns="http://www.w3.org/2000/svg"
                style={svgStyle}
                role="img"
                aria-label={labels.symmetryDiagram}
                aria-describedby={valuesId}
              >
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--color-bg)" rx={10} />
                <rect
                  x={lowerLeft.x}
                  y={upperRight.y}
                  width={upperRight.x - lowerLeft.x}
                  height={lowerLeft.y - upperRight.y}
                  fill="none"
                  stroke="var(--color-line-strong)"
                />
                {hiddenLines.map(({ segment, color, dash }) => {
                  if (segment === null) return null;
                  const from = unitToPixel(segment.from);
                  const to = unitToPixel(segment.to);
                  return (
                    <line
                      key={color}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray={dash}
                    />
                  );
                })}
                {XOR_POINTS.map((point) => {
                  const center = unitToPixel(point);
                  return point.target === 0 ? (
                    <circle
                      key={`${point.x}-${point.y}`}
                      cx={center.x}
                      cy={center.y}
                      r={POINT_RADIUS}
                      fill="var(--color-stage-prepa)"
                    />
                  ) : (
                    <rect
                      key={`${point.x}-${point.y}`}
                      x={center.x - POINT_RADIUS}
                      y={center.y - POINT_RADIUS}
                      width={2 * POINT_RADIUS}
                      height={2 * POINT_RADIUS}
                      fill="var(--color-accent)"
                    />
                  );
                })}
              </svg>
              <ul
                aria-label={labels.legendNetwork}
                data-testid="initialization-legend"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 16px',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  fontSize: '12px',
                  color: 'var(--color-fg)',
                }}
              >
                {legendItems.map((item) => (
                  <li
                    key={item.label}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg width={24} height={8} aria-hidden="true" focusable="false">
                      <line
                        x1={0}
                        y1={4}
                        x2={24}
                        y2={4}
                        stroke={item.color}
                        strokeWidth={2}
                        strokeDasharray={item.dash}
                      />
                    </svg>
                    {item.label}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <BarChart
                testId="initialization-deviation-plot"
                diagram={labels.deviationDiagram}
                describedBy={valuesId}
                axisLabel={`${labels.axisLayer} - ${labels.axisDeviation}`}
                values={layers.map((layer) => layer.activationStandardDeviation)}
                color="var(--color-stage-prepa)"
                locale={locale}
                layerValueText={labels.layerValueText}
              />
              <BarChart
                testId="initialization-gradient-plot"
                diagram={labels.gradientDiagram}
                describedBy={valuesId}
                axisLabel={`${labels.axisLayer} - ${labels.axisGradient}`}
                values={layers.map((layer) => layer.weightGradientNorm)}
                color="var(--color-accent)"
                locale={locale}
                layerValueText={labels.layerValueText}
              />
            </>
          )}
        </div>
        <div>
          <div
            role="group"
            aria-label={labels.modeGroup}
            style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              aria-pressed={isSymmetryMode}
              data-testid="initialization-mode-symmetry"
              style={toggleButtonStyle(isSymmetryMode)}
              onClick={() => changeMode('symmetry')}
            >
              {labels.modes.symmetry}
            </button>
            <button
              type="button"
              aria-pressed={!isSymmetryMode}
              data-testid="initialization-mode-depth"
              style={toggleButtonStyle(!isSymmetryMode)}
              onClick={() => changeMode('depth')}
            >
              {labels.modes.depth}
            </button>
          </div>
          {isSymmetryMode ? (
            <>
              {renderChoiceGroup(
                labels.startGroup,
                STARTS,
                start,
                changeStart,
                'initialization-start',
                labels.starts,
              )}
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  data-testid="initialization-step"
                  style={actionButtonStyle(isFinished)}
                  aria-disabled={isFinished ? 'true' : undefined}
                  onClick={step}
                >
                  {labels.step}
                </button>
                <button
                  type="button"
                  data-testid="initialization-run"
                  style={actionButtonStyle(isRunInactive)}
                  aria-disabled={isRunInactive ? 'true' : undefined}
                  onClick={toggle}
                >
                  {isRunning ? labels.pause : labels.run}
                </button>
                <button
                  type="button"
                  data-testid="initialization-reset"
                  style={buttonStyle}
                  onClick={restart}
                >
                  {labels.reset}
                </button>
              </div>
            </>
          ) : (
            <>
              {renderChoiceGroup(
                labels.activationGroup,
                ACTIVATIONS,
                activation,
                setActivation,
                'initialization-activation',
                labels.activations,
              )}
              {renderChoiceGroup(
                labels.schemeGroup,
                SCHEMES,
                scheme,
                setScheme,
                'initialization-scheme',
                labels.schemes,
              )}
              <div style={groupLabelStyle}>{labels.batchNorm}</div>
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  aria-pressed={isBatchNormalized}
                  data-testid="initialization-batch-norm"
                  style={toggleButtonStyle(isBatchNormalized)}
                  onClick={() => setIsBatchNormalized((previous) => !previous)}
                >
                  {labels.batchNorm}
                </button>
              </div>
            </>
          )}
          <div
            id={valuesId}
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
            {isSymmetryMode ? (
              <>
                <div>
                  {labels.stepCount} :{' '}
                  <span data-testid="initialization-step-count" style={valueStyle}>
                    {snapshot.step}
                  </span>
                </div>
                <div>
                  {labels.loss} :{' '}
                  <span data-testid="initialization-loss" style={valueStyle}>
                    {formatNumber(snapshot.loss, locale)}
                  </span>
                </div>
                <div>
                  {labels.twinDistance} :{' '}
                  <span data-testid="initialization-twin-distance" style={valueStyle}>
                    {formatNumber(snapshot.twinDistance, locale)}
                  </span>
                </div>
                <div>
                  {labels.predictions} :{' '}
                  <span data-testid="initialization-predictions" style={valueStyle}>
                    {snapshot.predictions
                      .map((prediction) => formatNumber(prediction, locale, 2))
                      .join(' · ')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  {labels.standardDeviation} :{' '}
                  <span data-testid="initialization-deviation-range" style={valueStyle}>
                    {formatScientific(layers[0].activationStandardDeviation, locale)}
                    {' → '}
                    {formatScientific(
                      layers[layers.length - 1].activationStandardDeviation,
                      locale,
                    )}
                  </span>
                </div>
                <div>
                  {labels.gradientNorm} :{' '}
                  <span data-testid="initialization-gradient-range" style={valueStyle}>
                    {formatScientific(layers[0].weightGradientNorm, locale)}
                    {' → '}
                    {formatScientific(layers[layers.length - 1].weightGradientNorm, locale)}
                  </span>
                </div>
              </>
            )}
          </div>
          <div role="status" style={visuallyHiddenStyle}>
            {announcement}
          </div>
        </div>
      </div>
    </div>
  );
}
