import { useMemo, useState, type JSX } from 'react';
import { rankCandidates, normalize, type Metric } from './similarity/similarity';

interface CandidateInput {
  id: string;
  label: string;
  vector: [number, number];
}

interface Props {
  initialQuery?: [number, number];
  candidates: CandidateInput[];
  range?: number;
  labels?: {
    queryLabel?: string;
    metricTitle?: string;
    cosineLabel?: string;
    euclideanLabel?: string;
    dotLabel?: string;
    normalizeLabel?: string;
    rankingTitle?: string;
    scoreLabel?: string;
    helpText?: string;
  };
}

const SIZE = 320;
const PAD = 28;

function formatScore(n: number): string {
  return n.toFixed(2);
}

export default function SimilarityExplorer({
  initialQuery = [1, 0],
  candidates,
  range = 2,
  labels = {},
}: Props): JSX.Element {
  const [query, setQuery] = useState<[number, number]>(initialQuery);
  const [metric, setMetric] = useState<Metric>('cosine');
  const [normalized, setNormalized] = useState<boolean>(false);

  const queryLabel = labels.queryLabel ?? 'requête';
  const metricTitle = labels.metricTitle ?? 'Mesure de proximité';
  const cosineLabel = labels.cosineLabel ?? 'Cosinus (angle)';
  const euclideanLabel = labels.euclideanLabel ?? 'Distance euclidienne';
  const dotLabel = labels.dotLabel ?? 'Produit scalaire';
  const normalizeLabel = labels.normalizeLabel ?? 'Normaliser les vecteurs';
  const rankingTitle = labels.rankingTitle ?? 'Classement des candidats';
  const scoreLabel = labels.scoreLabel ?? 'score';
  const helpText =
    labels.helpText ??
    'Déplace la requête et change la mesure pour voir comment le classement évolue. La normalisation efface les différences de longueur : seule la direction compte.';

  const center = SIZE / 2;
  const scale = (SIZE - 2 * PAD) / (2 * range);
  const toPxX = (val: number): number => center + val * scale;
  const toPxY = (val: number): number => center - val * scale;

  const setCoord = (idx: 0 | 1, value: number): void => {
    const next: [number, number] = [query[0], query[1]];
    next[idx] = value;
    setQuery(next);
  };

  const ranked = useMemo(() => {
    const rawCandidates = candidates.map((c) => ({ id: c.id, vector: c.vector as number[] }));
    return rankCandidates(query as number[], rawCandidates, metric, { normalized });
  }, [query, candidates, metric, normalized]);

  const labelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of candidates) {
      map[c.id] = c.label;
    }
    return map;
  }, [candidates]);

  const gridLines = [-2, -1, 0, 1, 2].filter((g) => Math.abs(g) <= range);

  const normalizedQuery: [number, number] = useMemo(() => {
    const n = normalize(query as number[]);
    return [n[0] ?? 0, n[1] ?? 0];
  }, [query]);

  const unitRadius = scale;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="grid items-start gap-6 sm:grid-cols-[320px_1fr]">
        {/* Plan SVG */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block w-full max-w-[320px]"
          role="img"
          aria-label="Plan 2D avec la requête et les candidats"
        >
          <rect x="0" y="0" width={SIZE} height={SIZE} fill="var(--color-bg)" rx="8" />

          {/* Grille pointillée */}
          {gridLines.map((g) => (
            <g key={`grid-${g}`}>
              <line
                x1={PAD}
                y1={toPxY(g)}
                x2={SIZE - PAD}
                y2={toPxY(g)}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray={g === 0 ? '' : '3 3'}
              />
              <line
                x1={toPxX(g)}
                y1={PAD}
                x2={toPxX(g)}
                y2={SIZE - PAD}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray={g === 0 ? '' : '3 3'}
              />
            </g>
          ))}

          {/* Axes */}
          <line
            x1={PAD}
            y1={center}
            x2={SIZE - PAD}
            y2={center}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />
          <line
            x1={center}
            y1={PAD}
            x2={center}
            y2={SIZE - PAD}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />

          {/* Labels axes */}
          <text
            x={SIZE - PAD - 4}
            y={center - 6}
            fill="var(--color-fg-dim)"
            fontSize="11"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            x
          </text>
          <text
            x={center + 6}
            y={PAD + 4}
            fill="var(--color-fg-dim)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            y
          </text>

          {/* Cercle unité quand normalisation active */}
          {normalized && (
            <circle
              cx={center}
              cy={center}
              r={unitRadius}
              fill="none"
              stroke="var(--color-fg-dim)"
              strokeWidth="0.75"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          )}

          <defs>
            <marker
              id="se-arrow-query"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {/* Candidats : cercles */}
          {candidates.map((c) => {
            const unit = normalize(c.vector as number[]);
            const vx = normalized ? unit[0] ?? 0 : c.vector[0];
            const vy = normalized ? unit[1] ?? 0 : c.vector[1];
            const px = toPxX(vx);
            const py = toPxY(vy);
            const isTop = ranked[0]?.id === c.id;
            return (
              <g key={c.id}>
                <circle
                  cx={px}
                  cy={py}
                  r={isTop ? 6 : 5}
                  fill={isTop ? 'var(--color-accent)' : '#60a5fa'}
                  opacity={isTop ? 1 : 0.75}
                />
                <text
                  x={px + 8}
                  y={py + 4}
                  fill={isTop ? 'var(--color-accent)' : '#60a5fa'}
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight={isTop ? '700' : '400'}
                >
                  {c.label}
                </text>
              </g>
            );
          })}

          {/* Flèche requête */}
          {(() => {
            const qx = normalized ? normalizedQuery[0] : query[0];
            const qy = normalized ? normalizedQuery[1] : query[1];
            return (
              <line
                x1={center}
                y1={center}
                x2={toPxX(qx)}
                y2={toPxY(qy)}
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                markerEnd="url(#se-arrow-query)"
              />
            );
          })()}
          {(() => {
            const qx = normalized ? normalizedQuery[0] : query[0];
            const qy = normalized ? normalizedQuery[1] : query[1];
            return (
              <text
                x={toPxX(qx) + 6}
                y={toPxY(qy) - 6}
                fill="var(--color-accent)"
                fontSize="13"
                fontFamily="var(--font-mono)"
                fontWeight="700"
              >
                {queryLabel}
              </text>
            );
          })()}
        </svg>

        {/* Panneau de contrôle */}
        <div className="space-y-4">
          {/* Sliders requête */}
          <div className="grid grid-cols-2 gap-3">
            {([0, 1] as const).map((idx) => (
              <label key={`q-${idx}`} className="block">
                <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                  {queryLabel}
                  <sub>{idx + 1}</sub> ={' '}
                  <span className="text-[var(--color-accent)]">
                    {formatScore(query[idx])}
                  </span>
                </span>
                <input
                  type="range"
                  min={-range}
                  max={range}
                  step={0.05}
                  value={query[idx]}
                  aria-label={`${queryLabel} composante ${idx + 1}`}
                  onChange={(e) => setCoord(idx, Number(e.target.value))}
                  className="learning-slider"
                />
              </label>
            ))}
          </div>

          {/* Sélecteur de métrique */}
          <fieldset>
            <legend className="mb-1.5 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {metricTitle}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {([
                ['cosine', cosineLabel],
                ['euclidean', euclideanLabel],
                ['dot', dotLabel],
              ] as [Metric, string][]).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metric === m}
                  onClick={() => setMetric(m)}
                  className={[
                    'rounded px-2.5 py-1 text-[11px] font-mono border transition-colors',
                    metric === m
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold'
                      : 'border-[var(--color-line)] text-[var(--color-fg-muted)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]',
                  ].join(' ')}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Checkbox normalisation */}
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-fg-muted)]">
            <input
              type="checkbox"
              checked={normalized}
              onChange={(e) => setNormalized(e.target.checked)}
              className="rounded accent-[var(--color-accent)]"
            />
            {normalizeLabel}
          </label>

          {/* Classement */}
          <div>
            <p className="mb-1.5 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {rankingTitle}
            </p>
            <ol className="space-y-1">
              {ranked.map((rc) => {
                const isFirst = rc.rank === 1;
                return (
                  <li
                    key={rc.id}
                    className={[
                      'flex items-center gap-2 rounded px-2 py-1 font-mono text-[12px]',
                      isFirst
                        ? 'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] border border-[var(--color-accent)]'
                        : 'border border-[var(--color-line)] bg-[var(--color-bg)]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-5 shrink-0 text-center font-semibold',
                        isFirst ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-dim)]',
                      ].join(' ')}
                    >
                      {rc.rank}
                    </span>
                    <span
                      className={[
                        'flex-1',
                        isFirst ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-fg)]',
                      ].join(' ')}
                    >
                      {labelById[rc.id] ?? rc.id}
                    </span>
                    <span className="text-[var(--color-fg-dim)]">
                      {scoreLabel} {formatScore(rc.score)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="text-[12px] text-[var(--color-fg-dim)] italic">{helpText}</p>
        </div>
      </div>
    </figure>
  );
}
