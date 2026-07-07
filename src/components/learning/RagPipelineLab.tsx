import { useMemo, useState, type JSX } from 'react';
import {
  retrieve,
  buildContext,
  generateGrounded,
  generateParametric,
  type RagDocument,
  type RagQuery,
} from './rag-pipeline/rag-pipeline';

// ---------------------------------------------------------------------------
// Constantes de couleur (statuts de reponse)
// ---------------------------------------------------------------------------

const COLOR_GROUNDED = '#22c55e'; // vert : reponse fondee
const COLOR_REFUSAL = '#f59e0b'; // ambre : refus honnete
const COLOR_HALLUCINATED = '#ef4444'; // rouge : hallucination

// ---------------------------------------------------------------------------
// Props (tout le texte de langue vient du MDX bilingue)
// ---------------------------------------------------------------------------

export interface RagPipelineLabDoc {
  id: string;
  text: string;
  tokens: string[];
  vector: number[];
  fact?: string;
  answersQueryIds?: string[];
}

export interface RagPipelineLabQuery {
  id: string;
  label: string;
  caption: string;
  tokens: string[];
  vector: number[];
  parametricAnswer: string;
  parametricStatus: 'hallucinated' | 'vague';
  refusalText: string;
}

export interface RagPipelineLabProps {
  k1: number;
  b: number;
  rrfK: number;
  defaultK: number;
  documents: RagPipelineLabDoc[];
  queries: RagPipelineLabQuery[];
  labels: {
    queryTitle: string;
    modeTitle: string;
    modeParametric: string;
    modeRag: string;
    budgetTitle: string;
    retrievedTitle: string;
    inContextBadge: string;
    outOfBudgetBadge: string;
    parametricIgnores: string;
    answerTitle: string;
    sourcesLabel: string;
    noSourceLabel: string;
    badgeGrounded: string;
    badgeRefusal: string;
    badgeHallucinated: string;
    badgeVague: string;
    insightTitle: string;
    insightParametric: string;
    insightGrounded: string;
    insightRefusalBudget: string;
    insightRefusalMissing: string;
  };
}

type Mode = 'parametric' | 'rag';

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function RagPipelineLab({
  k1,
  b,
  rrfK,
  defaultK,
  documents,
  queries,
  labels,
}: RagPipelineLabProps): JSX.Element {
  const firstQueryId = queries[0]?.id ?? '';
  const [selectedQueryId, setSelectedQueryId] = useState<string>(firstQueryId);
  const [mode, setMode] = useState<Mode>('rag');
  const [k, setK] = useState<number>(defaultK);

  const query = useMemo(
    () => queries.find((q) => q.id === selectedQueryId) ?? queries[0],
    [queries, selectedQueryId],
  );

  // Les documents passes en props sont deja compatibles avec le moteur pur.
  const docs = documents as RagDocument[];

  const ranked = useMemo(() => {
    if (!query) return [];
    return retrieve(query as RagQuery, docs, { k1, b, rrfK });
  }, [query, docs, k1, b, rrfK]);

  const context = useMemo(() => buildContext(ranked, k), [ranked, k]);

  const grounded = useMemo(() => {
    if (!query) return null;
    return generateGrounded(query as RagQuery, context);
  }, [query, context]);

  const parametric = useMemo(() => {
    if (!query) return null;
    return generateParametric(query as RagQuery);
  }, [query]);

  if (!query || !grounded || !parametric) return <></>;

  // Un passage du CORPUS complet porte-t-il le fait ? Sert a distinguer un refus
  // du a un budget trop serre (le fait existe mais hors contexte) d un refus car
  // aucun document ne porte la reponse.
  const carrierExists = docs.some((d) => d.answersQueryIds?.includes(query.id));
  const isRag = mode === 'rag';

  // Choix de l encadre insight selon la situation observee.
  const insightText = !isRag
    ? labels.insightParametric
    : grounded.status === 'grounded'
      ? labels.insightGrounded
      : carrierExists
        ? labels.insightRefusalBudget
        : labels.insightRefusalMissing;

  // Couleur et libelle du badge de la carte reponse.
  const badge = !isRag
    ? parametric.status === 'hallucinated'
      ? { color: COLOR_HALLUCINATED, label: labels.badgeHallucinated }
      : { color: COLOR_REFUSAL, label: labels.badgeVague }
    : grounded.status === 'grounded'
      ? { color: COLOR_GROUNDED, label: labels.badgeGrounded }
      : { color: COLOR_REFUSAL, label: labels.badgeRefusal };

  const answerText = isRag ? grounded.text : parametric.text;
  const citedIds = isRag
    ? grounded.citations.map((c) => context[c - 1]?.doc.id).filter(Boolean)
    : [];

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
      </div>

      {/* Bascule de mode : LLM seul vs LLM + RAG */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.modeTitle}
        </p>
        {(
          [
            { m: 'parametric' as Mode, label: labels.modeParametric },
            { m: 'rag' as Mode, label: labels.modeRag },
          ]
        ).map(({ m, label }) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
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

      {/* Levier k : budget de contexte (seulement en mode RAG) */}
      {isRag && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.budgetTitle}
          </p>
          {Array.from({ length: docs.length }, (_, i) => i + 1).map((value) => {
            const isActive = k === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setK(value)}
                aria-pressed={isActive}
                className={[
                  'w-7 rounded border py-1 font-mono text-[11px] transition-colors',
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
                {value}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Colonne des passages recuperes */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.retrievedTitle}
          </p>
          <ol className="space-y-2">
            {ranked.map((passage) => {
              const inContext = isRag && passage.rank <= k;
              const dimmed = !isRag || !inContext;
              return (
                <li
                  key={passage.doc.id}
                  className="rounded border p-2 text-[12px] transition-colors"
                  style={{
                    borderColor: inContext ? COLOR_GROUNDED : 'var(--color-line)',
                    backgroundColor: inContext ? `${COLOR_GROUNDED}10` : 'var(--color-bg)',
                    opacity: dimmed ? 0.5 : 1,
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className="font-mono text-[10px] shrink-0"
                      style={{ color: inContext ? COLOR_GROUNDED : 'var(--color-fg-muted)' }}
                    >
                      #{passage.rank}
                    </span>
                    {inContext && (
                      <span
                        className="rounded px-1 py-0.5 font-mono text-[9px] font-semibold leading-none shrink-0"
                        style={{ backgroundColor: `${COLOR_GROUNDED}22`, color: COLOR_GROUNDED }}
                      >
                        {labels.inContextBadge}
                      </span>
                    )}
                    {isRag && !inContext && (
                      <span className="font-mono text-[9px] text-[var(--color-fg-dim)] shrink-0">
                        {labels.outOfBudgetBadge}
                      </span>
                    )}
                  </div>
                  <p className="leading-snug text-[var(--color-fg)]">{passage.doc.text}</p>
                </li>
              );
            })}
          </ol>
          {!isRag && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
              {labels.parametricIgnores}
            </p>
          )}
        </div>

        {/* Colonne de la reponse */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
            {labels.answerTitle}
          </p>
          <div
            className="rounded border p-3"
            style={{ borderColor: badge.color, backgroundColor: `${badge.color}0d` }}
          >
            <div className="mb-2">
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
                style={{ backgroundColor: `${badge.color}22`, color: badge.color }}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-fg)]">{answerText}</p>
            <p className="mt-2 font-mono text-[10px] text-[var(--color-fg-dim)]">
              {citedIds.length > 0
                ? `${labels.sourcesLabel} ${citedIds.join(', ')}`
                : labels.noSourceLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Encadre insight contextuel */}
      <div className="mt-4 rounded border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-muted)]">
          {labels.insightTitle}
        </p>
        <p className="text-[12px] leading-relaxed text-[var(--color-fg)]">{insightText}</p>
      </div>
    </figure>
  );
}
