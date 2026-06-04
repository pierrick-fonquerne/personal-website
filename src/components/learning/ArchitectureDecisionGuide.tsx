import { useState, type JSX } from 'react';

interface AnswerOption {
  label: string;
  /** Points granted to each model id when this option is selected. */
  scores: Record<string, number>;
}

interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
}

interface ModelResult {
  id: string;
  label: string;
  /** Shown when this model wins. */
  recommendation: string;
}

interface Props {
  questions: Question[];
  models: ModelResult[];
  resultLabel: string;
  pendingLabel: string;
  resetLabel: string;
  tieLabel: string;
}

export default function ArchitectureDecisionGuide({
  questions,
  models,
  resultLabel,
  pendingLabel,
  resetLabel,
  tieLabel,
}: Props): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const select = (questionId: string, optionIndex: number): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const reset = (): void => {
    setAnswers({});
  };

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const totals: Record<string, number> = {};
  for (const model of models) totals[model.id] = 0;
  for (const q of questions) {
    const idx = answers[q.id];
    if (idx === undefined) continue;
    const option = q.options[idx];
    if (!option) continue;
    for (const [modelId, points] of Object.entries(option.scores)) {
      totals[modelId] = (totals[modelId] ?? 0) + points;
    }
  }

  const maxScore = Math.max(...models.map((m) => totals[m.id] ?? 0));
  const winners = models.filter((m) => (totals[m.id] ?? 0) === maxScore && maxScore > 0);
  const winner = winners.length === 1 ? winners[0] : undefined;

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      <ol className="flex flex-col gap-5">
        {questions.map((q, qIdx) => (
          <li key={q.id}>
            <p className="mb-2 text-[14px] font-medium text-[var(--color-fg)]">
              <span className="mr-2 font-mono text-[12px] text-[var(--color-accent)]">
                {qIdx + 1}.
              </span>
              {q.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, optIdx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => select(q.id, optIdx)}
                  className={`rounded-md border px-3 py-1.5 text-left font-mono text-[12px] transition-colors ${
                    answers[q.id] === optIdx
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 border-t border-[var(--color-line)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
            {resultLabel}
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--color-line)] px-3 py-1 font-mono text-[11px] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]"
          >
            {resetLabel}
          </button>
        </div>
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          {models.map((m) => {
            const score = totals[m.id] ?? 0;
            const isWinner = allAnswered && winner?.id === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-md border p-3 ${
                  isWinner
                    ? 'border-[var(--color-success)] bg-[var(--color-success)]/5'
                    : 'border-[var(--color-line)] bg-[var(--color-bg)]'
                }`}
              >
                <p className="font-mono text-[12px] text-[var(--color-fg)]">{m.label}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-[var(--color-line)]">
                  <div
                    className={`h-full transition-all ${
                      isWinner ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]'
                    }`}
                    style={{
                      width: `${maxScore > 0 ? Math.round((score / Math.max(maxScore, 1)) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {!allAnswered && <p className="text-[13px] text-[var(--color-fg-dim)]">{pendingLabel}</p>}
        {allAnswered && winner && (
          <p className="text-[13px] leading-relaxed text-[var(--color-fg)]">
            {winner.recommendation}
          </p>
        )}
        {allAnswered && !winner && (
          <p className="text-[13px] leading-relaxed text-[var(--color-fg)]">{tieLabel}</p>
        )}
      </div>
    </section>
  );
}
