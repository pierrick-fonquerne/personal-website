import { useState, type JSX } from 'react';

export type HistoryBranch = 'trunk' | 'response1' | 'response2' | 'response3';

export interface HistoryNode {
  id: string;
  year: string;
  label: string;
  branch: HistoryBranch;
}

export interface Bifurcation1969Labels {
  helpText?: string;
  response1Title?: string;
  response2Title?: string;
  response3Title?: string;
  soagMarker?: string;
  resetLabel?: string;
}

export interface Bifurcation1969Props {
  nodes?: HistoryNode[];
  labels?: Bifurcation1969Labels;
}

const DEFAULT_NODES: HistoryNode[] = [
  {
    id: 'mcculloch-pitts',
    year: '1943',
    label: 'McCulloch et Pitts : le neurone logique, sans etat',
    branch: 'trunk',
  },
  {
    id: 'hebb',
    year: '1949',
    label: 'Hebb : les neurones qui s\'activent ensemble se renforcent',
    branch: 'trunk',
  },
  {
    id: 'rosenblatt',
    year: '1958',
    label: 'Rosenblatt : le perceptron apprenant',
    branch: 'trunk',
  },
  {
    id: 'minsky-papert',
    year: '1969',
    label: 'Minsky et Papert : le perceptron ne sait pas faire XOR',
    branch: 'trunk',
  },
  {
    id: 'backprop',
    year: '1986',
    label: 'Retropropagation (Rumelhart, Hinton, Williams)',
    branch: 'response1',
  },
  {
    id: 'alexnet',
    year: '2012',
    label: 'Deep learning (AlexNet)',
    branch: 'response1',
  },
  {
    id: 'llm',
    year: '2020',
    label: 'LLM et modeles de fondation',
    branch: 'response1',
  },
  {
    id: 'stdp',
    year: '1998',
    label: 'STDP (Bi et Poo)',
    branch: 'response2',
  },
  {
    id: 'spiking',
    year: '2010',
    label: 'Reseaux spiking auto-organises',
    branch: 'response2',
  },
  {
    id: 'soag',
    year: '2024',
    label: 'SOAG ?',
    branch: 'response2',
  },
  {
    id: 'jepa',
    year: '2022',
    label: 'LeCun : world model concu (JEPA)',
    branch: 'response3',
  },
];

const RESPONSE_BRANCHES: HistoryBranch[] = ['response1', 'response2', 'response3'];

const BRANCH_COLORS: Record<HistoryBranch, string> = {
  trunk: 'var(--color-fg-muted)',
  response1: 'var(--color-accent)',
  response2: 'var(--color-accent)',
  response3: 'var(--color-accent)',
};

export default function Bifurcation1969({
  nodes = DEFAULT_NODES,
  labels = {},
}: Bifurcation1969Props): JSX.Element {
  const [selected, setSelected] = useState<HistoryBranch | null>(null);

  const helpText =
    labels.helpText ??
    'En 1969, le champ bifurque. Choisis une branche pour suivre son chemin. SOAG explore la reponse 2, longtemps laissee de cote.';
  const response1Title = labels.response1Title ?? 'Reponse 1 : empiler des couches';
  const response2Title = labels.response2Title ?? 'Reponse 2 : enrichir le composant';
  const response3Title = labels.response3Title ?? 'Reponse 3 : world model concu';
  const soagMarker = labels.soagMarker ?? 'SOAG';
  const resetLabel = labels.resetLabel ?? 'Reinitialiser';

  const branchTitles: Record<HistoryBranch, string> = {
    trunk: '',
    response1: response1Title,
    response2: response2Title,
    response3: response3Title,
  };

  const trunkNodes = nodes.filter((n) => n.branch === 'trunk');
  const bifurcationNode = trunkNodes[trunkNodes.length - 1];

  const nodesForBranch = (branch: HistoryBranch): HistoryNode[] =>
    nodes.filter((n) => n.branch === branch).sort((a, b) => a.year.localeCompare(b.year));

  const handleBranchClick = (branch: HistoryBranch): void => {
    setSelected((prev) => (prev === branch ? null : branch));
  };

  const handleBranchKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    branch: HistoryBranch,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBranchClick(branch);
    }
  };

  const handleReset = (): void => {
    setSelected(null);
  };

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const isBranchDimmed = (branch: HistoryBranch): boolean =>
    selected !== null && selected !== branch;

  const isBranchHighlighted = (branch: HistoryBranch): boolean => selected === branch;

  const nodeCardClass = (node: HistoryNode): string => {
    const base =
      'rounded border px-3 py-2 transition-all duration-200';
    if (node.branch === 'trunk') {
      return `${base} border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg)]`;
    }
    const dimmed = isBranchDimmed(node.branch);
    const highlighted = isBranchHighlighted(node.branch);
    if (dimmed) {
      return `${base} border-[var(--color-line)] bg-[var(--color-bg)] opacity-30 text-[var(--color-fg-dim)]`;
    }
    if (highlighted) {
      return `${base} border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-fg)]`;
    }
    return `${base} border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg)]`;
  };

  const branchHeaderClass = (branch: HistoryBranch): string => {
    const base =
      'w-full rounded border px-3 py-2 text-left font-mono text-[12px] tracking-[0.04em] uppercase transition-all duration-200 cursor-pointer';
    const dimmed = isBranchDimmed(branch);
    const highlighted = isBranchHighlighted(branch);
    if (dimmed) {
      return `${base} border-[var(--color-line)] text-[var(--color-fg-dim)] opacity-30`;
    }
    if (highlighted) {
      return `${base} border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg)]`;
    }
    return `${base} border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)]`;
  };

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <p className="mb-5 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

      <div className="flex flex-col items-center gap-0">
        {trunkNodes.map((node, idx) => (
          <div key={node.id} className="flex w-full max-w-sm flex-col items-center">
            <div className={nodeCardClass(node)}>
              <span className="font-mono text-[11px] text-[var(--color-fg-dim)] tracking-[0.06em] uppercase">
                {node.year}
              </span>
              <p className="mt-0.5 text-[13px] leading-[1.4] text-[var(--color-fg)]">
                {node.label}
              </p>
            </div>
            {idx < trunkNodes.length - 1 && (
              <div
                className="h-6 w-px"
                style={{ background: BRANCH_COLORS.trunk }}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-0 flex items-start justify-center gap-0" aria-hidden="true">
        <div className="h-6 w-px" style={{ background: 'var(--color-fg-muted)' }} />
      </div>
      <div className="relative flex items-start justify-center">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'var(--color-line-strong)' }}
          aria-hidden="true"
        />
      </div>

      <div
        className="mt-0 grid gap-4 sm:grid-cols-3"
        role="group"
        aria-label={bifurcationNode ? `Bifurcation depuis ${bifurcationNode.year}` : 'Bifurcation'}
      >
        {RESPONSE_BRANCHES.map((branch) => {
          const branchNodes = nodesForBranch(branch);
          return (
            <div key={branch} className="flex flex-col gap-2 pt-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-px flex-shrink-0"
                  style={{
                    background: isBranchDimmed(branch)
                      ? 'var(--color-line)'
                      : isBranchHighlighted(branch)
                        ? 'var(--color-accent)'
                        : 'var(--color-fg-muted)',
                    opacity: isBranchDimmed(branch) ? 0.3 : 1,
                  }}
                  aria-hidden="true"
                />
              </div>

              <button
                type="button"
                className={branchHeaderClass(branch)}
                aria-pressed={selected === branch}
                aria-label={branchTitles[branch]}
                onClick={() => handleBranchClick(branch)}
                onKeyDown={(e) => handleBranchKeyDown(e, branch)}
              >
                {branchTitles[branch]}
              </button>

              <div className="flex flex-col gap-2">
                {branchNodes.map((node, idx) => {
                  const isSoag = node.id === 'soag';
                  return (
                    <div key={node.id} className="flex flex-col items-start gap-0">
                      {idx > 0 && (
                        <div
                          className="ml-3 h-4 w-px"
                          style={{
                            background: isBranchHighlighted(branch)
                              ? 'var(--color-accent)'
                              : 'var(--color-line-strong)',
                            opacity: isBranchDimmed(branch) ? 0.3 : 1,
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <div className={nodeCardClass(node)}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[var(--color-fg-dim)] tracking-[0.06em] uppercase">
                            {node.year}
                          </span>
                          {isSoag && (
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase"
                              style={{
                                color: 'var(--color-accent)',
                                border: '1px solid var(--color-accent)',
                                opacity: isBranchDimmed(branch) ? 0.3 : 1,
                              }}
                            >
                              {soagMarker}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] leading-[1.4]">{node.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className={buttonClass}
          onClick={handleReset}
          disabled={selected === null}
          aria-label={resetLabel}
        >
          {resetLabel}
        </button>
      </div>
    </figure>
  );
}
