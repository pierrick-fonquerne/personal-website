import { useCallback, useMemo, useRef, useState, type JSX } from 'react';
import { mulberry32 } from './dimension-curse/dimension-curse';
import {
  buildHnsw,
  exhaustiveNearest,
  randomPoints,
  searchHnsw,
} from './hnsw/hnsw';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HnswNavigatorProps {
  seed: number;
  pointCount: number;
  initialM: number;
  initialEf: number;
  labels: {
    mLabel: string;
    efLabel: string;
    reshuffleLabel: string;
    stepLabel: string;
    playLabel: string;
    resetLabel: string;
    queryHint: string;
    entryLabel: string;
    queryLabel: string;
    resultLabel: string;
    oracleLabel: string;
    visitedLabel: string;
    layerLabel: string;
    baseLayerLabel: string;
    hitLabel: string;
    missLabel: string;
    statusIdleLabel: string;
  };
}

// ---------------------------------------------------------------------------
// Constantes de mise en page
// ---------------------------------------------------------------------------

const LAYER_SVG_W = 480;
const LAYER_SVG_H = 180;
const PAD = 24;
const NODE_R = 5;

// Palette semantique : on utilise les variables CSS du site
const COLOR_NODE = 'var(--color-fg-muted)';
const COLOR_EDGE = 'var(--color-line)';
const COLOR_VISITED = 'var(--color-accent)';
const COLOR_RESULT = '#22c55e'; // vert succes
const COLOR_ORACLE = '#f59e0b'; // ambre oracle
const COLOR_ENTRY = '#a78bfa'; // violet point d entree
const COLOR_QUERY = '#f43f5e'; // rose requete

// ---------------------------------------------------------------------------
// Helpers visuels
// ---------------------------------------------------------------------------

function actionButtonClass(): string {
  return 'rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1 font-mono text-[11px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] transition-colors';
}

// Projette une coordonnee [0,1] vers le repere SVG de la couche
function toSvgX(v: number): number {
  return PAD + v * (LAYER_SVG_W - 2 * PAD);
}

function toSvgY(v: number): number {
  return PAD + v * (LAYER_SVG_H - 2 * PAD);
}

// Projette depuis le repere SVG vers [0,1]
function fromSvgX(px: number): number {
  return Math.max(0, Math.min(1, (px - PAD) / (LAYER_SVG_W - 2 * PAD)));
}

function fromSvgY(py: number): number {
  return Math.max(0, Math.min(1, (py - PAD) / (LAYER_SVG_H - 2 * PAD)));
}

// ---------------------------------------------------------------------------
// Etat de la recherche pas-a-pas
// ---------------------------------------------------------------------------

type SearchStatus = 'idle' | 'running' | 'done';

interface SearchState {
  status: SearchStatus;
  /** Couche courante affichee pendant l avance pas-a-pas (de maxLevel vers 0) */
  currentLayerStep: number;
  /** Identifiant HNSW retourne */
  resultId: number | null;
  /** Vrai voisin oracle */
  oracleId: number | null;
  /** Chemin visite par couche */
  perLayerPath: number[][];
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function HnswNavigator({
  seed,
  pointCount,
  initialM,
  initialEf,
  labels,
}: HnswNavigatorProps): JSX.Element {
  // Controles sliders
  const [m, setM] = useState<number>(initialM);
  const [ef, setEf] = useState<number>(initialEf);
  const [shuffleOffset, setShuffleOffset] = useState<number>(0);

  // Requete : coordonnees dans [0,1]
  const [query, setQuery] = useState<[number, number]>([0.5, 0.5]);

  // Etat de la recherche
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle',
    currentLayerStep: 0,
    resultId: null,
    oracleId: null,
    perLayerPath: [],
  });

  const svgBaseRef = useRef<SVGSVGElement>(null);

  // Points et graphe
  const { points, graph } = useMemo(() => {
    const rng1 = mulberry32(seed + shuffleOffset);
    const pts = randomPoints(pointCount, 2, rng1);
    const rng2 = mulberry32(seed + shuffleOffset + 1);
    const g = buildHnsw(pts, m, rng2);
    return { points: pts, graph: g };
  }, [seed, shuffleOffset, m, pointCount]);

  // Resultat complet de la recherche (recalcule a chaque changement)
  const fullSearchResult = useMemo(() => {
    const q = [query[0], query[1]];
    const res = searchHnsw(graph, points, q, ef);
    const oracle = exhaustiveNearest(points, q);
    return { ...res, oracleId: oracle };
  }, [graph, points, query, ef]);

  // Layers du haut vers le bas pour l affichage
  const layerIndices = useMemo<number[]>(() => {
    const indices: number[] = [];
    for (let l = graph.maxLevel; l >= 0; l -= 1) {
      indices.push(l);
    }
    return indices;
  }, [graph.maxLevel]);

  // Noeuds visibles dans une couche (ceux que le graphe contient)
  const nodesInLayer = useCallback(
    (level: number): number[] => {
      const layer = graph.layers[level];
      if (!layer) return [];
      return [...layer.keys()];
    },
    [graph],
  );

  // Visites affichees selon le step courant
  const visitedUpToStep = useMemo<Set<number>[]>(() => {
    const step = searchState.currentLayerStep;
    const perLayerPath = fullSearchResult.perLayerPath;
    return layerIndices.map((level) => {
      const layerRank = graph.maxLevel - level; // rang depuis le sommet (0 = couche max)
      if (layerRank >= step) {
        // Pas encore atteint ou couche courante : on affiche les visites jusqu ici
        if (layerRank === step - 1 || searchState.status === 'done') {
          return new Set(perLayerPath[level] ?? []);
        }
        return new Set<number>();
      }
      // Couches deja passees : tout afficher
      return new Set(perLayerPath[level] ?? []);
    });
  }, [
    searchState.currentLayerStep,
    searchState.status,
    fullSearchResult.perLayerPath,
    layerIndices,
    graph.maxLevel,
  ]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleReshuffle = (): void => {
    setShuffleOffset((prev) => prev + 1);
    setSearchState({ status: 'idle', currentLayerStep: 0, resultId: null, oracleId: null, perLayerPath: [] });
  };

  const handleReset = (): void => {
    setSearchState({ status: 'idle', currentLayerStep: 0, resultId: null, oracleId: null, perLayerPath: [] });
  };

  const handleStep = (): void => {
    const maxStep = graph.maxLevel + 1; // on compte de maxLevel a 0 inclus
    setSearchState((prev) => {
      if (prev.status === 'done') return prev;
      const nextStep = prev.currentLayerStep + 1;
      const done = nextStep >= maxStep;
      return {
        status: done ? 'done' : 'running',
        currentLayerStep: nextStep,
        resultId: done ? fullSearchResult.resultId : null,
        oracleId: done ? fullSearchResult.oracleId : null,
        perLayerPath: fullSearchResult.perLayerPath,
      };
    });
  };

  const handlePlay = (): void => {
    const maxStep = graph.maxLevel + 1;
    setSearchState({
      status: 'done',
      currentLayerStep: maxStep,
      resultId: fullSearchResult.resultId,
      oracleId: fullSearchResult.oracleId,
      perLayerPath: fullSearchResult.perLayerPath,
    });
  };

  const handleMChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setM(Number(e.target.value));
    setSearchState({ status: 'idle', currentLayerStep: 0, resultId: null, oracleId: null, perLayerPath: [] });
  };

  const handleEfChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEf(Number(e.target.value));
    handleReset();
  };

  // Clic dans le SVG de la couche de base -> deplace la requete
  const handleBaseLayerClick = (e: React.MouseEvent<SVGSVGElement>): void => {
    const svg = svgBaseRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = LAYER_SVG_W / rect.width;
    const scaleY = LAYER_SVG_H / rect.height;
    const nx = fromSvgX(px * scaleX);
    const ny = fromSvgY(py * scaleY);
    setQuery([nx, ny]);
    setSearchState({ status: 'idle', currentLayerStep: 0, resultId: null, oracleId: null, perLayerPath: [] });
  };

  const QUERY_KEYBOARD_STEP = 0.02;

  // Arrow keys on the query point -> move the query
  const handleQueryPointKeyDown = (e: React.KeyboardEvent<SVGGElement>): void => {
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -QUERY_KEYBOARD_STEP;
    else if (e.key === 'ArrowRight') dx = QUERY_KEYBOARD_STEP;
    else if (e.key === 'ArrowUp') dy = -QUERY_KEYBOARD_STEP;
    else if (e.key === 'ArrowDown') dy = QUERY_KEYBOARD_STEP;
    else return;
    e.preventDefault();
    setQuery(([x, y]) => [Math.max(0, Math.min(1, x + dx)), Math.max(0, Math.min(1, y + dy))]);
    setSearchState({ status: 'idle', currentLayerStep: 0, resultId: null, oracleId: null, perLayerPath: [] });
  };

  // ---------------------------------------------------------------------------
  // Rendu d une couche SVG
  // ---------------------------------------------------------------------------

  const renderLayer = (level: number, isBase: boolean): JSX.Element => {
    const layer = graph.layers[level];
    if (!layer) return <></>;

    const nodes = nodesInLayer(level);
    const visitedSet = visitedUpToStep[layerIndices.indexOf(level)] ?? new Set<number>();
    const layerRank = graph.maxLevel - level;
    const isCurrentStep =
      searchState.status === 'running' && layerRank === searchState.currentLayerStep - 1;

    const resultId = searchState.status === 'done' ? (searchState.resultId ?? -1) : -1;
    const oracleId = searchState.status === 'done' ? (searchState.oracleId ?? -1) : -1;
    const entryPoint = graph.entryPoint;

    const labelText = isBase
      ? labels.baseLayerLabel
      : `${labels.layerLabel} ${level}`;

    return (
      <div key={`layer-${level}`} className="mb-3">
        {/* En-tete de couche */}
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)]">
            {labelText}
          </span>
          <span className="font-mono text-[10px] text-[var(--color-fg-dim)]">
            {nodes.length}
            {' '}
            pts
          </span>
          {isCurrentStep && (
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]"
              aria-hidden="true"
            />
          )}
        </div>

        {/* SVG de la couche */}
        <svg
          viewBox={`0 0 ${LAYER_SVG_W} ${LAYER_SVG_H}`}
          className="block w-full rounded border border-[var(--color-line)] bg-[var(--color-bg)]"
          role="img"
          aria-label={labelText}
          ref={isBase ? svgBaseRef : undefined}
          onClick={isBase ? handleBaseLayerClick : undefined}
          style={isBase ? { cursor: 'crosshair' } : undefined}
        >
          {/* Fond */}
          <rect
            x={0}
            y={0}
            width={LAYER_SVG_W}
            height={LAYER_SVG_H}
            fill="var(--color-bg)"
            rx="4"
          />

          {/* Aretes */}
          {nodes.map((nodeId) => {
            const neighbors = layer.get(nodeId) ?? [];
            const pt = points[nodeId];
            if (!pt) return null;
            return neighbors.map((neighborId) => {
              if (neighborId <= nodeId) return null; // evite le double rendu
              const neighbor = points[neighborId];
              if (!neighbor) return null;
              const isHighlighted =
                visitedSet.has(nodeId) && visitedSet.has(neighborId);
              return (
                <line
                  key={`e-${nodeId}-${neighborId}`}
                  x1={toSvgX(pt[0] ?? 0.5)}
                  y1={toSvgY(pt[1] ?? 0.5)}
                  x2={toSvgX(neighbor[0] ?? 0.5)}
                  y2={toSvgY(neighbor[1] ?? 0.5)}
                  stroke={isHighlighted ? COLOR_VISITED : COLOR_EDGE}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  strokeOpacity={isHighlighted ? 0.7 : 0.4}
                />
              );
            });
          })}

          {/* Noeuds */}
          {nodes.map((nodeId) => {
            const pt = points[nodeId];
            if (!pt) return null;
            const cx = toSvgX(pt[0] ?? 0.5);
            const cy = toSvgY(pt[1] ?? 0.5);

            const isVisited = visitedSet.has(nodeId);
            const isResult = nodeId === resultId;
            const isOracle = nodeId === oracleId;
            const isEntry = nodeId === entryPoint && level === graph.maxLevel;

            let fill = COLOR_NODE;
            let r = NODE_R;
            if (isOracle) { fill = COLOR_ORACLE; r = NODE_R + 2; }
            if (isResult) { fill = COLOR_RESULT; r = NODE_R + 2; }
            if (isEntry && level === graph.maxLevel) { fill = COLOR_ENTRY; r = NODE_R + 1; }
            if (isVisited && !isResult && !isOracle) { fill = COLOR_VISITED; }

            return (
              <circle
                key={`n-${nodeId}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                fillOpacity={isVisited || isResult || isOracle ? 0.95 : 0.35}
                stroke={isResult || isOracle ? fill : 'none'}
                strokeWidth={isResult || isOracle ? 2 : 0}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Point de requete (couche de base seulement), accessible au clavier */}
          {isBase && (
            <g
              tabIndex={0}
              role="slider"
              aria-label={labels.queryLabel}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={query[0]}
              onKeyDown={handleQueryPointKeyDown}
            >
              <circle
                cx={toSvgX(query[0])}
                cy={toSvgY(query[1])}
                r={NODE_R + 3}
                fill="none"
                stroke={COLOR_QUERY}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
              <circle
                cx={toSvgX(query[0])}
                cy={toSvgY(query[1])}
                r={NODE_R - 1}
                fill={COLOR_QUERY}
                fillOpacity={0.9}
              />
            </g>
          )}
        </svg>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Statut resultat
  // ---------------------------------------------------------------------------

  const statusBadge = (): JSX.Element | null => {
    if (searchState.status === 'idle') {
      return (
        <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
          {labels.statusIdleLabel}
        </span>
      );
    }
    if (searchState.status !== 'done' || searchState.resultId === null) return null;
    const hit = searchState.resultId === searchState.oracleId;
    return (
      <span
        className={[
          'rounded px-2 py-0.5 font-mono text-[11px] font-semibold',
          hit
            ? 'bg-green-500/10 text-green-500 border border-green-500/30'
            : 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
        ].join(' ')}
      >
        {hit ? labels.hitLabel : labels.missLabel}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // Legende
  // ---------------------------------------------------------------------------

  const legend = (): JSX.Element => (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[var(--color-fg-muted)]">
      {[
        { color: COLOR_ENTRY, label: labels.entryLabel },
        { color: COLOR_QUERY, label: labels.queryLabel },
        { color: COLOR_VISITED, label: labels.visitedLabel },
        { color: COLOR_RESULT, label: labels.resultLabel },
        { color: COLOR_ORACLE, label: labels.oracleLabel },
      ].map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill={color} />
          </svg>
          {label}
        </span>
      ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Rendu principal
  // ---------------------------------------------------------------------------

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Controles sliders */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        {/* Slider M */}
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
            {labels.mLabel}{' '}
            <span className="text-[var(--color-accent)] font-semibold">{m}</span>
          </span>
          <input
            type="range"
            min={2}
            max={16}
            step={1}
            value={m}
            aria-label={labels.mLabel}
            onChange={handleMChange}
            className="learning-slider"
          />
        </label>

        {/* Slider ef */}
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
            {labels.efLabel}{' '}
            <span className="text-[var(--color-accent)] font-semibold">{ef}</span>
          </span>
          <input
            type="range"
            min={1}
            max={32}
            step={1}
            value={ef}
            aria-label={labels.efLabel}
            onChange={handleEfChange}
            className="learning-slider"
          />
        </label>
      </div>

      {/* Boutons d action */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleReshuffle} className={actionButtonClass()}>
          {labels.reshuffleLabel}
        </button>
        <button
          type="button"
          onClick={handleStep}
          disabled={searchState.status === 'done'}
          aria-disabled={searchState.status === 'done'}
          className={actionButtonClass()}
        >
          {labels.stepLabel}
        </button>
        <button
          type="button"
          onClick={handlePlay}
          disabled={searchState.status === 'done'}
          aria-disabled={searchState.status === 'done'}
          className={actionButtonClass()}
        >
          {labels.playLabel}
        </button>
        <button type="button" onClick={handleReset} className={actionButtonClass()}>
          {labels.resetLabel}
        </button>

        {/* Badge de statut */}
        <div className="ml-auto flex items-center">{statusBadge()}</div>
      </div>

      {/* Legende */}
      <div className="mb-4">{legend()}</div>

      {/* Hint couche de base */}
      <p className="mb-3 font-mono text-[10px] text-[var(--color-fg-dim)]">
        {labels.queryHint}
      </p>

      {/* Couches HNSW empilees : du sommet vers la base */}
      <div>
        {layerIndices.map((level) => renderLayer(level, level === 0))}
      </div>
    </figure>
  );
}
