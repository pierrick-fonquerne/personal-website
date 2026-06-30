import { useMemo, useState, type JSX } from 'react';
import {
  corpusStats,
  bm25Score,
  cosineSimilarity,
  rank,
  reciprocalRankFusion,
  naiveSumFusion,
  type ScoredDoc,
  type RankedDoc,
} from './hybrid-search/hybrid-search';

// ---------------------------------------------------------------------------
// Constantes de couleur
// ---------------------------------------------------------------------------

const COLOR_OK = '#22c55e';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HybridSearchLabDoc {
  id: string;
  text: string;
  tokens: string[];
  vector: number[];
}

export interface HybridSearchLabQuery {
  id: string;
  label: string;
  caption: string;
  tokens: string[];
  vector: number[];
}

export interface HybridSearchLabProps {
  k1: number;
  b: number;
  rrfK: number;
  documents: HybridSearchLabDoc[];
  queries: HybridSearchLabQuery[];
  labels: {
    queryTitle: string;
    queryTokensLabel: string;
    fusionTitle: string;
    fusionRrf: string;
    fusionNaive: string;
    lexicalTitle: string;
    semanticTitle: string;
    hybridTitle: string;
    rankLabel: string;
    scoreLabel: string;
    topBadge: string;
    zeroHint: string;
    insightTitle: string;
    insightExact: string;
    insightParaphrase: string;
    insightFusion: string;
  };
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function HybridSearchLab({
  k1,
  b,
  rrfK,
  documents,
  queries,
  labels,
}: HybridSearchLabProps): JSX.Element {
  const firstQueryId = queries[0]?.id ?? '';
  const [selectedQueryId, setSelectedQueryId] = useState<string>(firstQueryId);
  const [fusionMode, setFusionMode] = useState<'rrf' | 'naive'>('rrf');

  const stats = useMemo(() => corpusStats(documents), [documents]);

  const query = useMemo(
    () => queries.find((q) => q.id === selectedQueryId) ?? queries[0],
    [queries, selectedQueryId],
  );

  const docTextMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of documents) {
      m.set(d.id, d.text);
    }
    return m;
  }, [documents]);

  const selectedQueryIndex = useMemo(
    () => queries.findIndex((q) => q.id === selectedQueryId),
    [queries, selectedQueryId],
  );

  const { lexRanked, semRanked, hybridRanked } = useMemo((): {
    lexRanked: RankedDoc[];
    semRanked: RankedDoc[];
    hybridRanked: RankedDoc[];
  } => {
    if (!query) {
      return { lexRanked: [], semRanked: [], hybridRanked: [] };
    }
    const params = { k1, b };
    const lexScored: ScoredDoc[] = documents.map((d) => ({
      id: d.id,
      score: bm25Score(query.tokens, d, stats, params),
    }));
    const semScored: ScoredDoc[] = documents.map((d) => ({
      id: d.id,
      score: cosineSimilarity(query.vector, d.vector),
    }));
    const lex = rank(lexScored);
    const sem = rank(semScored);
    const hybrid =
      fusionMode === 'rrf'
        ? reciprocalRankFusion([lex, sem], rrfK)
        : naiveSumFusion([lexScored, semScored]);
    return { lexRanked: lex, semRanked: sem, hybridRanked: hybrid };
  }, [query, documents, stats, k1, b, rrfK, fusionMode]);

  if (!query) return <></>;

  const hasLexZero = lexRanked.some((d) => d.score === 0);

  const fusionOptions: { mode: 'rrf' | 'naive'; label: string }[] = [
    { mode: 'rrf', label: labels.fusionRrf },
    { mode: 'naive', label: labels.fusionNaive },
  ];

  const renderColumn = (ranked: RankedDoc[], showZeroHint: boolean): JSX.Element => (
    <ol className="space-y-2">
      {ranked.map((item) => {
        const isTop = item.rank === 1;
        const isZero = item.score === 0;
        const text = docTextMap.get(item.id) ?? item.id;
        return (
          <li
            key={item.id}
            className="rounded border p-2 text-[12px] transition-colors"
            style={{
              borderColor: isTop ? COLOR_OK : 'var(--color-line)',
              backgroundColor: isTop ? `${COLOR_OK}10` : 'var(--color-bg)',
              opacity: isZero ? 0.45 : 1,
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono text-[10px] shrink-0"
                  style={{ color: isTop ? COLOR_OK : 'var(--color-fg-muted)' }}
                >
                  #{item.rank}
                </span>
                {isTop && (
                  <span
                    className="rounded px-1 py-0.5 font-mono text-[9px] font-semibold leading-none shrink-0"
                    style={{ backgroundColor: `${COLOR_OK}22`, color: COLOR_OK }}
                  >
                    {labels.topBadge}
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] text-[var(--color-fg-dim)] shrink-0">
                {item.score.toFixed(3)}
              </span>
            </div>
            <p className="leading-snug text-[var(--color-fg)]">{text}</p>
          </li>
        );
      })}
      {showZeroHint && hasLexZero && (
        <li
          className="pt-1 font-mono text-[10px] text-[var(--color-fg-dim)]"
          aria-live="polite"
        >
          {labels.zeroHint}
        </li>
      )}
    </ol>
  );

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Selecteur de requete */}
      <div className="mb-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.queryTitle}
        </p>
        <div className="flex flex-wrap gap-2">
          {queries.map((q) => {
            const isActive = q.id === selectedQueryId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQueryId(q.id)}
                aria-pressed={isActive}
                className={[
                  'rounded border px-3 py-1.5 text-left transition-colors',
                  isActive
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-line)] bg-[var(--color-bg)]',
                ].join(' ')}
                style={
                  isActive
                    ? { backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }
                    : {}
                }
              >
                <span
                  className="block text-[12px] font-medium"
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-fg)' }}
                >
                  {q.label}
                </span>
                <span className="block font-mono text-[10px] text-[var(--color-fg-dim)]">
                  {q.caption}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tokens de la requete */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
            {labels.queryTokensLabel}
          </span>
          {query.tokens.map((t) => (
            <span
              key={t}
              className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Selecteur de methode de fusion */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.fusionTitle}
        </p>
        {fusionOptions.map(({ mode, label }) => {
          const isActive = fusionMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setFusionMode(mode)}
              aria-pressed={isActive}
              className={[
                'rounded border px-3 py-1 font-mono text-[11px] transition-colors',
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
              ].join(' ')}
              style={
                isActive
                  ? { backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }
                  : {}
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Trois colonnes de classement */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.lexicalTitle}
          </p>
          {renderColumn(lexRanked, true)}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.semanticTitle}
          </p>
          {renderColumn(semRanked, false)}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.hybridTitle}
          </p>
          {renderColumn(hybridRanked, false)}
        </div>
      </div>

      {/* Encadre insight */}
      <div className="mt-4 rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.insightTitle}
        </p>
        <p className="text-[12px] leading-relaxed text-[var(--color-fg)]">
          {selectedQueryIndex === 0 ? labels.insightExact : labels.insightParaphrase}
        </p>
        {fusionMode === 'naive' && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-fg-muted)]">
            {labels.insightFusion}
          </p>
        )}
      </div>
    </figure>
  );
}
