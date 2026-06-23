import { useMemo, useRef, useState, type JSX } from 'react';
import { mulberry32 } from './dimension-curse/dimension-curse';
import { makeClusteredDataset, exactNeighbors } from './ann-landscape/ann-landscape';
import {
  buildProximityGraph,
  beamSearchKnn,
  localChecks,
  recallForQuery,
  evaluateAgainstOracle,
} from './recall-oracle/recall-oracle';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RecallOracleLabProps {
  seed: number;
  pointCount: number;
  clusterCount: number;
  spread: number;
  degree: number;
  initialEf: number;
  topK: number;
  recallThreshold: number;
  queryCount?: number;
  maxEf?: number;
  labels: {
    invertedHeapLabel: string;
    halvedConnectivityLabel: string;
    efLabel: string;
    queryHint: string;
    reshuffleLabel: string;
    legendQuery: string;
    legendRetrieved: string;
    legendOracle: string;
    legendVisited: string;
    localChecksTitle: string;
    checkReturnsK: string;
    checkSorted: string;
    checkDistinct: string;
    oracleTitle: string;
    recallAllLabel: string;
    recallQueryLabel: string;
    thresholdLabel: string;
    verdictGreenLabel: string;
    verdictHonestLabel: string;
    verdictBrokenLabel: string;
    blindHint: string;
  };
}

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

const SVG_W = 460;
const SVG_H = 360;
const PAD = 24;

const COLOR_POINT = 'var(--color-fg-muted)';
const COLOR_EDGE = 'var(--color-line)';
const COLOR_VISITED = 'var(--color-accent)';
const COLOR_RETRIEVED = '#22c55e'; // vert : voisins rendus
const COLOR_ORACLE = '#f59e0b'; // ambre : vrais voisins manques
const COLOR_QUERY = '#f43f5e'; // rose : requete
const COLOR_OK = '#22c55e';
const COLOR_BAD = '#ef4444';

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function RecallOracleLab({
  seed,
  pointCount,
  clusterCount,
  spread,
  degree,
  initialEf,
  topK,
  recallThreshold,
  queryCount = 24,
  maxEf = 32,
  labels,
}: RecallOracleLabProps): JSX.Element {
  const [invertedHeap, setInvertedHeap] = useState<boolean>(false);
  const [halvedConnectivity, setHalvedConnectivity] = useState<boolean>(false);
  const [ef, setEf] = useState<number>(initialEf);
  const [query, setQuery] = useState<[number, number]>([0.5, 0.5]);
  const [shuffleOffset, setShuffleOffset] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement>(null);

  const dataset = useMemo(
    () =>
      makeClusteredDataset(
        { pointCount, dimension: 2, queryCount, clusterCount, spread },
        mulberry32(seed + shuffleOffset),
      ),
    [pointCount, queryCount, clusterCount, spread, seed, shuffleOffset],
  );

  const graph = useMemo(
    () => buildProximityGraph(dataset.points, degree, halvedConnectivity),
    [dataset, degree, halvedConnectivity],
  );

  // Bornes du nuage pour la projection SVG.
  const bounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of dataset.points) {
      const x = p[0] as number;
      const y = p[1] as number;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }, [dataset]);

  const toSvgX = (x: number): number => {
    const span = bounds.maxX - bounds.minX || 1;
    return PAD + ((x - bounds.minX) / span) * (SVG_W - 2 * PAD);
  };
  const toSvgY = (y: number): number => {
    const span = bounds.maxY - bounds.minY || 1;
    return PAD + ((y - bounds.minY) / span) * (SVG_H - 2 * PAD);
  };
  const fromSvgX = (px: number): number => {
    const span = bounds.maxX - bounds.minX || 1;
    return bounds.minX + ((px - PAD) / (SVG_W - 2 * PAD)) * span;
  };
  const fromSvgY = (py: number): number => {
    const span = bounds.maxY - bounds.minY || 1;
    return bounds.minY + ((py - PAD) / (SVG_H - 2 * PAD)) * span;
  };

  // Recherche sur la requete courante + oracle exact.
  const current = useMemo(() => {
    const q = [query[0], query[1]];
    const result = beamSearchKnn(graph, dataset.points, q, { ef, k: topK, invertedHeap });
    const oracle = exactNeighbors(dataset.points, q, topK);
    const checks = localChecks(result, dataset.points, q, topK);
    const recall = recallForQuery(result, dataset.points, q, topK);
    return { result, oracle, checks, recall };
  }, [graph, dataset, query, ef, topK, invertedHeap]);

  // Oracle differentiel agrege sur tout le jeu de requetes.
  const aggregate = useMemo(
    () => evaluateAgainstOracle(graph, dataset.points, dataset.queries, topK, { ef, invertedHeap }),
    [graph, dataset, topK, ef, invertedHeap],
  );

  const retrievedSet = useMemo(() => new Set(current.result.ids), [current]);
  const oracleSet = useMemo(() => new Set(current.oracle), [current]);
  const visitedSet = useMemo(() => new Set(current.result.visitedOrder), [current]);

  const contractKept = aggregate.recall >= recallThreshold;
  const allLocalPass =
    current.checks.returnsK && current.checks.sortedByDistance && current.checks.idsDistinct;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>): void => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const py = ((e.clientY - rect.top) / rect.height) * SVG_H;
    setQuery([fromSvgX(px), fromSvgY(py)]);
  };

  const checkRow = (label: string, pass: boolean): JSX.Element => (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ backgroundColor: pass ? `${COLOR_OK}22` : `${COLOR_BAD}22`, color: pass ? COLOR_OK : COLOR_BAD }}
      >
        {pass ? '✓' : '✗'}
      </span>
      {label}
    </li>
  );

  const legendDot = (color: string, label: string): JSX.Element => (
    <span className="flex items-center gap-1">
      <svg width="10" height="10" aria-hidden="true">
        <circle cx="5" cy="5" r="4" fill={color} />
      </svg>
      {label}
    </span>
  );

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Interrupteurs de bug + ef */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setInvertedHeap((v) => !v)}
          aria-pressed={invertedHeap}
          className={[
            'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
            invertedHeap
              ? 'border-[#ef4444] bg-[#ef444422] text-[#ef4444]'
              : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
          ].join(' ')}
        >
          {labels.invertedHeapLabel}
        </button>
        <button
          type="button"
          onClick={() => setHalvedConnectivity((v) => !v)}
          aria-pressed={halvedConnectivity}
          className={[
            'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
            halvedConnectivity
              ? 'border-[#ef4444] bg-[#ef444422] text-[#ef4444]'
              : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
          ].join(' ')}
        >
          {labels.halvedConnectivityLabel}
        </button>
        <label className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.efLabel}{' '}
            <span className="font-semibold text-[var(--color-accent)]">{ef}</span>
          </span>
          <input
            type="range"
            min={topK}
            max={maxEf}
            step={1}
            value={ef}
            aria-label={labels.efLabel}
            onChange={(e) => setEf(Number(e.target.value))}
            className="learning-slider"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_minmax(180px,240px)]">
        {/* Nuage 2D */}
        <div>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="block w-full rounded border border-[var(--color-line)] bg-[var(--color-bg)]"
            role="img"
            aria-label="Nuage de points et recherche par faisceau"
            ref={svgRef}
            onClick={handleClick}
            style={{ cursor: 'crosshair' }}
          >
            {/* Aretes du graphe */}
            {graph.adjacency.map((neighbors, i) =>
              neighbors.map((j) => {
                if (j <= i) return null;
                const a = dataset.points[i] as number[];
                const b = dataset.points[j] as number[];
                return (
                  <line
                    key={`e-${i}-${j}`}
                    x1={toSvgX(a[0] as number)}
                    y1={toSvgY(a[1] as number)}
                    x2={toSvgX(b[0] as number)}
                    y2={toSvgY(b[1] as number)}
                    stroke={COLOR_EDGE}
                    strokeWidth={0.5}
                    strokeOpacity={0.3}
                  />
                );
              }),
            )}

            {/* Points */}
            {dataset.points.map((p, i) => {
              const isRetrieved = retrievedSet.has(i);
              const isOracle = oracleSet.has(i);
              const isVisited = visitedSet.has(i);
              const isMiss = isOracle && !isRetrieved;
              let fill = COLOR_POINT;
              let r = 2.5;
              let opacity = 0.4;
              if (isVisited) {
                fill = COLOR_VISITED;
                opacity = 0.7;
              }
              if (isRetrieved) {
                fill = COLOR_RETRIEVED;
                r = 4;
                opacity = 1;
              }
              if (isMiss) {
                fill = COLOR_ORACLE;
                r = 4;
                opacity = 1;
              }
              return (
                <circle
                  key={`p-${i}`}
                  cx={toSvgX(p[0] as number)}
                  cy={toSvgY(p[1] as number)}
                  r={r}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke={isMiss ? COLOR_ORACLE : 'none'}
                  strokeWidth={isMiss ? 1.5 : 0}
                />
              );
            })}

            {/* Requete */}
            <circle
              cx={toSvgX(query[0])}
              cy={toSvgY(query[1])}
              r={6}
              fill="none"
              stroke={COLOR_QUERY}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <circle cx={toSvgX(query[0])} cy={toSvgY(query[1])} r={3} fill={COLOR_QUERY} />
          </svg>

          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-[var(--color-fg-muted)]">
            {legendDot(COLOR_QUERY, labels.legendQuery)}
            {legendDot(COLOR_RETRIEVED, labels.legendRetrieved)}
            {legendDot(COLOR_ORACLE, labels.legendOracle)}
            {legendDot(COLOR_VISITED, labels.legendVisited)}
          </div>
          <p className="mt-1 font-mono text-[10px] text-[var(--color-fg-dim)]">{labels.queryHint}</p>

          <button
            type="button"
            onClick={() => setShuffleOffset((v) => v + 1)}
            className="mt-2 rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1 font-mono text-[11px] text-[var(--color-fg-muted)]"
          >
            {labels.reshuffleLabel}
          </button>
        </div>

        {/* Panneaux verts/rouge */}
        <div className="flex flex-col gap-3">
          {/* Tests locaux : toujours verts */}
          <div className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.localChecksTitle}
            </p>
            <ul className="space-y-1.5 text-[11px] text-[var(--color-fg)]">
              {checkRow(labels.checkReturnsK, current.checks.returnsK)}
              {checkRow(labels.checkSorted, current.checks.sortedByDistance)}
              {checkRow(labels.checkDistinct, current.checks.idsDistinct)}
            </ul>
            {allLocalPass && (
              <p
                className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${COLOR_OK}1a`, color: COLOR_OK }}
              >
                {labels.verdictGreenLabel}
              </p>
            )}
          </div>

          {/* Oracle differentiel : rouge sous le seuil */}
          <div
            className="rounded border p-3"
            style={{
              borderColor: contractKept ? 'var(--color-line)' : COLOR_BAD,
              backgroundColor: contractKept ? 'var(--color-bg)' : `${COLOR_BAD}10`,
            }}
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
              {labels.oracleTitle}
            </p>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-[var(--color-fg-muted)]">{labels.recallAllLabel}</span>
              <span
                className="font-mono text-lg font-bold"
                style={{ color: contractKept ? COLOR_OK : COLOR_BAD }}
              >
                {(aggregate.recall * 100).toFixed(0)} %
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[11px] text-[var(--color-fg-muted)]">
              <span>{labels.recallQueryLabel}</span>
              <span className="font-mono">{(current.recall * 100).toFixed(0)} %</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[11px] text-[var(--color-fg-dim)]">
              <span>{labels.thresholdLabel}</span>
              <span className="font-mono">{(recallThreshold * 100).toFixed(0)} %</span>
            </div>
            <p
              className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: contractKept ? `${COLOR_OK}1a` : `${COLOR_BAD}1a`,
                color: contractKept ? COLOR_OK : COLOR_BAD,
              }}
            >
              {contractKept ? labels.verdictHonestLabel : labels.verdictBrokenLabel}
            </p>
          </div>

          <p className="font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
            {labels.blindHint}
          </p>
        </div>
      </div>
    </figure>
  );
}
