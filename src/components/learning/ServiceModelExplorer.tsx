import { useState, type JSX } from 'react';

interface ScenarioOutcome {
  /** Status per model id: 'ok' | 'warn' | 'fail'. */
  status: 'ok' | 'warn' | 'fail';
  /** One-sentence explanation of what happens in this model. */
  text: string;
}

interface Scenario {
  id: string;
  label: string;
  outcomes: Record<string, ScenarioOutcome>;
}

interface ModelDef {
  id: string;
  label: string;
  description: string;
}

interface Props {
  models: ModelDef[];
  scenarios: Scenario[];
  scenarioLabel: string;
  legend: { ok: string; warn: string; fail: string };
}

const STATUS_STYLES: Record<ScenarioOutcome['status'], { dot: string; text: string }> = {
  ok: { dot: 'bg-[var(--color-success)]', text: 'text-[var(--color-success)]' },
  warn: { dot: 'bg-amber-400', text: 'text-amber-400' },
  fail: { dot: 'bg-red-400', text: 'text-red-400' },
};

export default function ServiceModelExplorer({
  models,
  scenarios,
  scenarioLabel,
  legend,
}: Props): JSX.Element {
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? '');

  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      <header className="mb-4">
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
          {scenarioLabel}
        </span>
      </header>
      <div className="mb-5 flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenarioId(s.id)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
              s.id === scenarioId
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {models.map((m) => {
          const outcome = scenario?.outcomes[m.id];
          if (!outcome) return null;
          const styles = STATUS_STYLES[outcome.status];
          return (
            <article
              key={m.id}
              className="flex flex-col gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-4"
            >
              <header className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
                <h4 className="font-mono text-[12px] tracking-[0.08em] text-[var(--color-fg)] uppercase">
                  {m.label}
                </h4>
              </header>
              <p className="text-[12px] leading-relaxed text-[var(--color-fg-dim)]">
                {m.description}
              </p>
              <p className={`mt-auto text-[13px] leading-relaxed ${styles.text}`}>{outcome.text}</p>
            </article>
          );
        })}
      </div>
      <footer className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] text-[var(--color-fg-dim)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" /> {legend.ok}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> {legend.warn}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" /> {legend.fail}
        </span>
      </footer>
    </section>
  );
}
