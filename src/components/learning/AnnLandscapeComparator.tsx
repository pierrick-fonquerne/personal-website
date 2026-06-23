import { useMemo, useState, type JSX } from 'react';
import { mulberry32 } from './dimension-curse/dimension-curse';
import { buildHnsw } from './hnsw/hnsw';
import {
  makeClusteredDataset,
  exactNeighbors,
  recallAtK,
  buildIvf,
  searchIvf,
  buildProductQuantizer,
  searchPq,
  searchHnswTopK,
  flatMemoryBytes,
  ivfMemoryBytes,
  hnswMemoryBytes,
  pqMemoryBytes,
  type IndexFamily,
} from './ann-landscape/ann-landscape';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnnLandscapeComparatorProps {
  seed: number;
  pointCount: number;
  dimension: number;
  clusterCount: number;
  spread: number;
  topK: number;
  cellCount: number;
  hnswM: number;
  initialNprobe: number;
  initialEf: number;
  initialSubquantizers: number;
  queryCount?: number;
  codesPerSubquantizer?: number;
  maxEf?: number;
  labels: {
    recallAxisLabel: string;
    latencyAxisLabel: string;
    memoryLegendLabel: string;
    nprobeLabel: string;
    efLabel: string;
    subquantizersLabel: string;
    flatLabel: string;
    ivfLabel: string;
    hnswLabel: string;
    pqLabel: string;
    recallReadout: string;
    latencyReadout: string;
    memoryReadout: string;
    bytesUnit: string;
    cornerHint: string;
    summaryFlat: string;
    summaryIvf: string;
    summaryHnsw: string;
    summaryPq: string;
  };
}

// ---------------------------------------------------------------------------
// Constantes de mise en page
// ---------------------------------------------------------------------------

const CHART_W = 480;
const CHART_H = 320;
const PAD_LEFT = 52;
const PAD_RIGHT = 24;
const PAD_TOP = 20;
const PAD_BOTTOM = 44;

const COLOR_FLAT = 'var(--color-fg-muted)';
const COLOR_IVF = 'var(--color-accent)';
const COLOR_HNSW = '#a78bfa'; // violet graphe
const COLOR_PQ = '#22c55e'; // vert compresse
const COLOR_GRID = 'var(--color-line)';

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface FamilyPoint {
  family: IndexFamily;
  label: string;
  color: string;
  recall: number;
  distanceComputations: number;
  memoryBytes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number, unit: string): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} M${unit}`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} k${unit}`;
  }
  return `${Math.round(bytes)} ${unit}`;
}

// Liste des decoupages PQ admissibles : puissances de deux divisant la dimension,
// avec au moins deux coordonnees par tranche.
function allowedSubquantizers(dimension: number): number[] {
  const list: number[] = [];
  for (let s = 2; s <= dimension / 2; s *= 2) {
    if (dimension % s === 0) {
      list.push(s);
    }
  }
  return list.length > 0 ? list : [1];
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function AnnLandscapeComparator({
  seed,
  pointCount,
  dimension,
  clusterCount,
  spread,
  topK,
  cellCount,
  hnswM,
  initialNprobe,
  initialEf,
  initialSubquantizers,
  queryCount = 16,
  codesPerSubquantizer = 32,
  maxEf = 48,
  labels,
}: AnnLandscapeComparatorProps): JSX.Element {
  const subquantizerChoices = useMemo(() => allowedSubquantizers(dimension), [dimension]);

  const [nprobe, setNprobe] = useState<number>(initialNprobe);
  const [ef, setEf] = useState<number>(initialEf);
  const [subquantizers, setSubquantizers] = useState<number>(
    subquantizerChoices.includes(initialSubquantizers)
      ? initialSubquantizers
      : (subquantizerChoices[0] as number),
  );

  // Jeu de donnees et verite terrain : construits une seule fois.
  const dataset = useMemo(
    () =>
      makeClusteredDataset(
        { pointCount, dimension, queryCount, clusterCount, spread },
        mulberry32(seed),
      ),
    [pointCount, dimension, queryCount, clusterCount, spread, seed],
  );

  const truths = useMemo(
    () => dataset.queries.map((q) => exactNeighbors(dataset.points, q, topK)),
    [dataset, topK],
  );

  // Index lourds : construits une seule fois (ou quand leur structure change).
  const hnswGraph = useMemo(
    () => buildHnsw(dataset.points, hnswM, mulberry32(seed + 1)),
    [dataset, hnswM, seed],
  );

  const ivfIndex = useMemo(
    () => buildIvf(dataset.points, cellCount, mulberry32(seed + 2)),
    [dataset, cellCount, seed],
  );

  const productQuantizer = useMemo(
    () =>
      buildProductQuantizer(
        dataset.points,
        subquantizers,
        codesPerSubquantizer,
        mulberry32(seed + 3),
      ),
    [dataset, subquantizers, codesPerSubquantizer, seed],
  );

  // ---------------------------------------------------------------------------
  // Profils mesures (moyennes sur les requetes)
  // ---------------------------------------------------------------------------

  const flatPoint = useMemo<FamilyPoint>(
    () => ({
      family: 'flat',
      label: labels.flatLabel,
      color: COLOR_FLAT,
      recall: 1,
      distanceComputations: dataset.points.length,
      memoryBytes: flatMemoryBytes(dataset.points.length, dimension),
    }),
    [dataset, dimension, labels.flatLabel],
  );

  const ivfPoint = useMemo<FamilyPoint>(() => {
    let recallSum = 0;
    let compSum = 0;
    dataset.queries.forEach((q, i) => {
      const trace = searchIvf(ivfIndex, dataset.points, q, topK, nprobe);
      recallSum += recallAtK(trace.ids, truths[i] as number[]);
      compSum += trace.distanceComputations;
    });
    const n = dataset.queries.length;
    return {
      family: 'ivf',
      label: labels.ivfLabel,
      color: COLOR_IVF,
      recall: recallSum / n,
      distanceComputations: compSum / n,
      memoryBytes: ivfMemoryBytes(ivfIndex, dataset.points.length, dimension),
    };
  }, [dataset, ivfIndex, nprobe, topK, truths, dimension, labels.ivfLabel]);

  const hnswPoint = useMemo<FamilyPoint>(() => {
    let recallSum = 0;
    let compSum = 0;
    dataset.queries.forEach((q, i) => {
      const trace = searchHnswTopK(hnswGraph, dataset.points, q, topK, ef);
      recallSum += recallAtK(trace.ids, truths[i] as number[]);
      compSum += trace.distanceComputations;
    });
    const n = dataset.queries.length;
    return {
      family: 'hnsw',
      label: labels.hnswLabel,
      color: COLOR_HNSW,
      recall: recallSum / n,
      distanceComputations: compSum / n,
      memoryBytes: hnswMemoryBytes(hnswGraph, dataset.points.length, dimension),
    };
  }, [dataset, hnswGraph, ef, topK, truths, dimension, labels.hnswLabel]);

  const pqPoint = useMemo<FamilyPoint>(() => {
    let recallSum = 0;
    let compSum = 0;
    dataset.queries.forEach((q, i) => {
      const trace = searchPq(productQuantizer, q, topK);
      recallSum += recallAtK(trace.ids, truths[i] as number[]);
      compSum += trace.distanceComputations;
    });
    const n = dataset.queries.length;
    return {
      family: 'pq',
      label: labels.pqLabel,
      color: COLOR_PQ,
      recall: recallSum / n,
      distanceComputations: compSum / n,
      memoryBytes: pqMemoryBytes(productQuantizer, dataset.points.length),
    };
  }, [dataset, productQuantizer, topK, truths, labels.pqLabel]);

  const families = useMemo<FamilyPoint[]>(
    () => [flatPoint, ivfPoint, hnswPoint, pqPoint],
    [flatPoint, ivfPoint, hnswPoint, pqPoint],
  );

  // ---------------------------------------------------------------------------
  // Projection vers le repere du graphique
  // ---------------------------------------------------------------------------

  const maxComparisons = Math.max(
    dataset.points.length,
    ...families.map((f) => f.distanceComputations),
  );
  const maxMemory = Math.max(1, ...families.map((f) => f.memoryBytes));

  // x : rappel dans [0, 1], vers la droite. y : comparaisons, le haut = peu (rapide).
  const toX = (recall: number): number => PAD_LEFT + recall * (CHART_W - PAD_LEFT - PAD_RIGHT);
  const toY = (comparisons: number): number =>
    PAD_TOP + (comparisons / maxComparisons) * (CHART_H - PAD_TOP - PAD_BOTTOM);
  const bubbleRadius = (memoryBytes: number): number =>
    8 + 22 * Math.sqrt(memoryBytes / maxMemory);

  const recallGrid = [0, 0.25, 0.5, 0.75, 1];
  const comparisonGrid = [0, 0.25, 0.5, 0.75, 1];

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Molettes */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.nprobeLabel}{' '}
            <span className="font-semibold text-[var(--color-accent)]">{nprobe}</span>
          </span>
          <input
            type="range"
            min={1}
            max={cellCount}
            step={1}
            value={nprobe}
            aria-label={labels.nprobeLabel}
            onChange={(e) => setNprobe(Number(e.target.value))}
            className="learning-slider"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.efLabel}{' '}
            <span className="font-semibold text-[#a78bfa]">{ef}</span>
          </span>
          <input
            type="range"
            min={1}
            max={maxEf}
            step={1}
            value={ef}
            aria-label={labels.efLabel}
            onChange={(e) => setEf(Number(e.target.value))}
            className="learning-slider"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.subquantizersLabel}{' '}
            <span className="font-semibold text-[#22c55e]">{subquantizers}</span>
          </span>
          <input
            type="range"
            min={0}
            max={subquantizerChoices.length - 1}
            step={1}
            value={subquantizerChoices.indexOf(subquantizers)}
            aria-label={labels.subquantizersLabel}
            onChange={(e) => setSubquantizers(subquantizerChoices[Number(e.target.value)] as number)}
            className="learning-slider"
          />
        </label>
      </div>

      {/* Graphique de Pareto */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="block w-full rounded border border-[var(--color-line)] bg-[var(--color-bg)]"
        role="img"
        aria-label={`${labels.recallAxisLabel} / ${labels.latencyAxisLabel}`}
      >
        {/* Grille verticale (rappel) */}
        {recallGrid.map((r) => (
          <g key={`gx-${r}`}>
            <line
              x1={toX(r)}
              y1={PAD_TOP}
              x2={toX(r)}
              y2={CHART_H - PAD_BOTTOM}
              stroke={COLOR_GRID}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
            <text
              x={toX(r)}
              y={CHART_H - PAD_BOTTOM + 14}
              textAnchor="middle"
              className="fill-[var(--color-fg-dim)] font-mono text-[9px]"
            >
              {r.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Grille horizontale (comparaisons) */}
        {comparisonGrid.map((c) => (
          <g key={`gy-${c}`}>
            <line
              x1={PAD_LEFT}
              y1={toY(c * maxComparisons)}
              x2={CHART_W - PAD_RIGHT}
              y2={toY(c * maxComparisons)}
              stroke={COLOR_GRID}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
            <text
              x={PAD_LEFT - 6}
              y={toY(c * maxComparisons) + 3}
              textAnchor="end"
              className="fill-[var(--color-fg-dim)] font-mono text-[9px]"
            >
              {Math.round(c * maxComparisons)}
            </text>
          </g>
        ))}

        {/* Titres d axes */}
        <text
          x={(PAD_LEFT + CHART_W - PAD_RIGHT) / 2}
          y={CHART_H - 6}
          textAnchor="middle"
          className="fill-[var(--color-fg-muted)] font-mono text-[10px]"
        >
          {labels.recallAxisLabel}
        </text>
        <text
          x={-((PAD_TOP + CHART_H - PAD_BOTTOM) / 2)}
          y={13}
          textAnchor="middle"
          transform="rotate(-90)"
          className="fill-[var(--color-fg-muted)] font-mono text-[10px]"
        >
          {labels.latencyAxisLabel}
        </text>

        {/* Bulles des familles */}
        {families.map((f) => {
          const cx = toX(f.recall);
          const cy = toY(f.distanceComputations);
          return (
            <g key={f.family}>
              <circle
                cx={cx}
                cy={cy}
                r={bubbleRadius(f.memoryBytes)}
                fill={f.color}
                fillOpacity={0.18}
                stroke={f.color}
                strokeWidth={1.5}
              />
              <circle cx={cx} cy={cy} r={3} fill={f.color} />
              <text
                x={cx}
                y={cy - bubbleRadius(f.memoryBytes) - 4}
                textAnchor="middle"
                className="font-mono text-[10px] font-semibold"
                fill={f.color}
              >
                {f.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legende memoire */}
      <p className="mt-2 font-mono text-[10px] text-[var(--color-fg-dim)]">
        {labels.memoryLegendLabel}
      </p>

      {/* Tableau de lecture */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="text-[var(--color-fg-muted)]">
              <th className="border-b border-[var(--color-line)] px-2 py-1 text-left" />
              <th className="border-b border-[var(--color-line)] px-2 py-1 text-right">
                {labels.recallReadout}
              </th>
              <th className="border-b border-[var(--color-line)] px-2 py-1 text-right">
                {labels.latencyReadout}
              </th>
              <th className="border-b border-[var(--color-line)] px-2 py-1 text-right">
                {labels.memoryReadout}
              </th>
            </tr>
          </thead>
          <tbody>
            {families.map((f) => (
              <tr key={f.family} className="text-[var(--color-fg)]">
                <td className="px-2 py-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: f.color }}
                      aria-hidden="true"
                    />
                    {f.label}
                  </span>
                </td>
                <td className="px-2 py-1 text-right">{(f.recall * 100).toFixed(1)} %</td>
                <td className="px-2 py-1 text-right">{Math.round(f.distanceComputations)}</td>
                <td className="px-2 py-1 text-right">
                  {formatBytes(f.memoryBytes, labels.bytesUnit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resume par famille */}
      <ul className="mt-4 space-y-1 text-[11px] text-[var(--color-fg-muted)]">
        <li>{labels.summaryFlat}</li>
        <li>{labels.summaryIvf}</li>
        <li>{labels.summaryHnsw}</li>
        <li>{labels.summaryPq}</li>
      </ul>

      <p className="mt-3 rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-[11px] text-[var(--color-fg-muted)]">
        {labels.cornerHint}
      </p>
    </figure>
  );
}
