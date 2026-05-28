import { useState, type JSX } from 'react';

interface Question {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

interface Props {
  questions: Question[];
  submitLabel?: string;
  resetLabel?: string;
  scoreLabel?: string;
}

interface QuestionState {
  selected: number | null;
  submitted: boolean;
}

const initialState = (count: number): QuestionState[] =>
  Array.from({ length: count }, () => ({ selected: null, submitted: false }));

export default function Quiz({
  questions,
  submitLabel = 'Valider',
  resetLabel = 'Recommencer',
  scoreLabel = 'Score',
}: Props): JSX.Element {
  const [states, setStates] = useState<QuestionState[]>(() => initialState(questions.length));

  const allSubmitted = states.every((s) => s.submitted);
  const score = states.filter((s, i) => s.submitted && s.selected === questions[i]?.answer).length;

  const select = (qIdx: number, optIdx: number): void => {
    setStates((prev) =>
      prev.map((s, i) =>
        i === qIdx && !s.submitted ? { ...s, selected: optIdx } : s,
      ),
    );
  };

  const submit = (qIdx: number): void => {
    setStates((prev) =>
      prev.map((s, i) =>
        i === qIdx && s.selected !== null ? { ...s, submitted: true } : s,
      ),
    );
  };

  const reset = (): void => {
    setStates(initialState(questions.length));
  };

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      <header className="mb-5 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
          Quiz
        </span>
        {allSubmitted && (
          <span className="font-mono text-[12px] text-[var(--color-fg)]">
            {scoreLabel} : {score} / {questions.length}
          </span>
        )}
      </header>
      <ol className="space-y-6">
        {questions.map((q, qIdx) => {
          const state = states[qIdx]!;
          return (
            <li key={qIdx}>
              <p className="mb-3 text-[15px] font-medium text-[var(--color-fg)]">
                {qIdx + 1}. {q.q}
              </p>
              <ul className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = state.selected === optIdx;
                  const isCorrect = optIdx === q.answer;
                  const showResult = state.submitted;
                  return (
                    <li key={optIdx}>
                      <button
                        type="button"
                        disabled={state.submitted}
                        onClick={() => select(qIdx, optIdx)}
                        className={[
                          'w-full rounded-md border px-4 py-2 text-left text-[14px] transition-colors',
                          showResult && isCorrect
                            ? 'border-[var(--color-success)] text-[var(--color-success)]'
                            : showResult && isSelected && !isCorrect
                              ? 'border-red-500 text-red-400'
                              : isSelected
                                ? 'border-[var(--color-accent)] text-[var(--color-fg)]'
                                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)]',
                          state.submitted ? 'cursor-default' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        {opt}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {state.submitted && q.explain && (
                <p className="mt-3 text-[13px] text-[var(--color-fg-muted)] italic">
                  {q.explain}
                </p>
              )}
              {!state.submitted && (
                <button
                  type="button"
                  disabled={state.selected === null}
                  onClick={() => submit(qIdx)}
                  className="mt-3 rounded-md border border-[var(--color-line-strong)] px-4 py-1.5 font-mono text-[11px] tracking-[0.14em] text-[var(--color-fg)] uppercase transition-colors hover:bg-[var(--color-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitLabel}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {allSubmitted && (
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md border border-[var(--color-line)] px-4 py-1.5 font-mono text-[11px] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase transition-colors hover:text-[var(--color-fg)]"
        >
          {resetLabel}
        </button>
      )}
    </section>
  );
}
