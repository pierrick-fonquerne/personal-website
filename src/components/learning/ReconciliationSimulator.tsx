import { useState, type JSX } from 'react';

interface EntityState {
  key: string;
  name: string;
  /** Whether the entity exists in the desired state declared by the control plane. */
  desired: boolean;
  /** Local copy held by the service, or null if absent. */
  local: { name: string; drifted: boolean } | null;
}

interface Labels {
  controlPlane: string;
  service: string;
  reconcile: string;
  reset: string;
  driftAction: string;
  removeAction: string;
  restoreAction: string;
  inSync: string;
  drifted: string;
  missing: string;
  orphaned: string;
  logEmpty: string;
  logDrift: string;
  logRemove: string;
  logRestore: string;
  logReconcile: string;
}

interface Props {
  entities: { key: string; name: string }[];
  driftSuffix: string;
  labels: Labels;
}

function initialState(entities: { key: string; name: string }[]): EntityState[] {
  return entities.map((e) => ({
    key: e.key,
    name: e.name,
    desired: true,
    local: { name: e.name, drifted: false },
  }));
}

export default function ReconciliationSimulator({
  entities,
  driftSuffix,
  labels,
}: Props): JSX.Element {
  const [state, setState] = useState<EntityState[]>(() => initialState(entities));
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (message: string): void => {
    setLog((prev) => [message, ...prev].slice(0, 6));
  };

  const drift = (key: string): void => {
    setState((prev) =>
      prev.map((e) =>
        e.key === key && e.local
          ? { ...e, local: { name: `${e.name} ${driftSuffix}`, drifted: true } }
          : e,
      ),
    );
    pushLog(labels.logDrift.replace('{key}', key));
  };

  const toggleDesired = (key: string, desired: boolean): void => {
    setState((prev) => prev.map((e) => (e.key === key ? { ...e, desired } : e)));
    pushLog((desired ? labels.logRestore : labels.logRemove).replace('{key}', key));
  };

  const reconcile = (): void => {
    setState((prev) =>
      prev.map((e) => ({
        ...e,
        local: e.desired ? { name: e.name, drifted: false } : null,
      })),
    );
    pushLog(labels.logReconcile);
  };

  const reset = (): void => {
    setState(initialState(entities));
    setLog([]);
  };

  const statusOf = (e: EntityState): { label: string; cls: string } => {
    if (e.desired && e.local && !e.local.drifted)
      return { label: labels.inSync, cls: 'text-[var(--color-success)]' };
    if (e.desired && e.local && e.local.drifted)
      return { label: labels.drifted, cls: 'text-amber-400' };
    if (e.desired && !e.local) return { label: labels.missing, cls: 'text-red-400' };
    return { label: labels.orphaned, cls: 'text-amber-400' };
  };

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
          <h4 className="mb-3 font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
            {labels.controlPlane}
          </h4>
          <ul className="flex flex-col gap-2">
            {state.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-2">
                <span
                  className={`font-mono text-[13px] ${
                    e.desired ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-dim)] line-through'
                  }`}
                >
                  {e.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleDesired(e.key, !e.desired)}
                  className="rounded border border-[var(--color-line)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]"
                >
                  {e.desired ? labels.removeAction : labels.restoreAction}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
          <h4 className="mb-3 font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
            {labels.service}
          </h4>
          <ul className="flex flex-col gap-2">
            {state.map((e) => {
              const status = statusOf(e);
              return (
                <li key={e.key} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-[var(--color-fg)]">
                    {e.local ? e.local.name : '—'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`font-mono text-[11px] ${status.cls}`}>{status.label}</span>
                    {e.local && !e.local.drifted && e.desired && (
                      <button
                        type="button"
                        onClick={() => drift(e.key)}
                        className="rounded border border-[var(--color-line)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]"
                      >
                        {labels.driftAction}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reconcile}
          className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-1.5 font-mono text-[12px] text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20"
        >
          {labels.reconcile}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-[var(--color-line)] px-4 py-1.5 font-mono text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]"
        >
          {labels.reset}
        </button>
      </div>
      <div className="mt-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
        {log.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--color-fg-dim)]">{labels.logEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {log.map((line, i) => (
              <li
                key={`${i}-${line}`}
                className={`font-mono text-[11px] ${
                  i === 0 ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-dim)]'
                }`}
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
