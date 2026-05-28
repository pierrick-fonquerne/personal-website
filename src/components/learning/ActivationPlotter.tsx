import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

type ActivationKind = 'identity' | 'sigmoid' | 'relu' | 'tanh';

interface Props {
  functions?: ActivationKind[];
  showDerivative?: boolean;
  showCursor?: boolean;
  range?: [number, number];
  height?: number;
  labels?: {
    derivativeLabel?: string;
    cursorLabel?: string;
    tangentLabel?: string;
    xRangeLabel?: string;
    minLabel?: string;
    maxLabel?: string;
  };
}

const ALL_KINDS: ActivationKind[] = ['identity', 'sigmoid', 'relu', 'tanh'];

const ACTIVATION_FN: Record<ActivationKind, (x: number) => number> = {
  identity: (x) => x,
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  relu: (x) => Math.max(0, x),
  tanh: (x) => Math.tanh(x),
};

const ACTIVATION_DERIVATIVE: Record<ActivationKind, (x: number) => number> = {
  identity: () => 1,
  sigmoid: (x) => {
    const s = 1 / (1 + Math.exp(-x));
    return s * (1 - s);
  },
  relu: (x) => (x > 0 ? 1 : 0),
  tanh: (x) => 1 - Math.tanh(x) ** 2,
};

const ACTIVATION_COLOR: Record<ActivationKind, string> = {
  identity: '#9ca3af',
  sigmoid: '#60a5fa',
  relu: '#34d399',
  tanh: '#f472b6',
};

const ACTIVATION_LABEL: Record<ActivationKind, string> = {
  identity: 'Identity',
  sigmoid: 'Sigmoid',
  relu: 'ReLU',
  tanh: 'Tanh',
};

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function formatNumber(n: number): string {
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(2);
  return n.toFixed(3);
}

export default function ActivationPlotter({
  functions = ['sigmoid', 'relu', 'tanh', 'identity'],
  showDerivative: showDerivativeInit = false,
  showCursor: showCursorInit = false,
  range = [-5, 5],
  height = 260,
  labels = {},
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState<Set<ActivationKind>>(() => new Set(functions));
  const [showDerivative, setShowDerivative] = useState<boolean>(showDerivativeInit);
  const [showCursor, setShowCursor] = useState<boolean>(showCursorInit);
  const [cursorX, setCursorX] = useState<number>(0);
  const [xMin, setXMin] = useState<number>(range[0]);
  const [xMax, setXMax] = useState<number>(range[1]);

  const derivativeLabel = labels.derivativeLabel ?? 'Dérivée';
  const cursorLabel = labels.cursorLabel ?? 'Curseur';
  const xRangeLabel = labels.xRangeLabel ?? 'Domaine de x';
  const minLabel = labels.minLabel ?? 'min';
  const maxLabel = labels.maxLabel ?? 'max';

  const clampedXMin = Math.min(xMin, xMax - 0.5);
  const clampedXMax = Math.max(xMax, xMin + 0.5);
  const safeCursorX = Math.max(clampedXMin, Math.min(clampedXMax, cursorX));

  const toggleKind = (kind: ActivationKind): void => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = height;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const lineColor = readCssVar('--color-line', '#2a2a2a');
    const fgDim = readCssVar('--color-fg-dim', '#7c7c7c');
    const accent = readCssVar('--color-accent', '#fb923c');
    const bg = readCssVar('--color-bg', '#0b0b0b');

    const yMin = -1.5;
    const yMax = 1.5;
    const padLeft = 36;
    const padRight = 10;
    const padTop = 12;
    const padBottom = 26;
    const plotW = cssWidth - padLeft - padRight;
    const plotH = cssHeight - padTop - padBottom;

    const xToPx = (x: number): number => padLeft + ((x - clampedXMin) / (clampedXMax - clampedXMin)) * plotW;
    const yToPx = (y: number): number => padTop + (1 - (y - yMin) / (yMax - yMin)) * plotH;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const xStep = (clampedXMax - clampedXMin) / 10;
    for (let i = 0; i <= 10; i += 1) {
      const px = padLeft + (i / 10) * plotW;
      ctx.moveTo(px, padTop);
      ctx.lineTo(px, padTop + plotH);
    }
    for (let gy = -1; gy <= 1; gy += 0.5) {
      const py = yToPx(gy);
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
    }
    ctx.stroke();

    ctx.strokeStyle = fgDim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padLeft, yToPx(0));
    ctx.lineTo(padLeft + plotW, yToPx(0));
    if (clampedXMin <= 0 && clampedXMax >= 0) {
      const xZero = xToPx(0);
      ctx.moveTo(xZero, padTop);
      ctx.lineTo(xZero, padTop + plotH);
    }
    ctx.stroke();

    ctx.fillStyle = fgDim;
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ['-1', '0', '1'].forEach((label, i) => {
      const yVal = i === 0 ? -1 : i === 1 ? 0 : 1;
      ctx.fillText(label, padLeft - 6, yToPx(yVal) + 4);
    });
    ctx.textAlign = 'center';
    [clampedXMin, (clampedXMin + clampedXMax) / 2, clampedXMax].forEach((xVal) => {
      ctx.fillText(xVal.toFixed(1), xToPx(xVal), padTop + plotH + 16);
    });

    const samples = Math.max(120, Math.floor(plotW));
    const step = (clampedXMax - clampedXMin) / samples;
    const activeKinds = ALL_KINDS.filter((k) => enabled.has(k));

    activeKinds.forEach((kind) => {
      const fn = ACTIVATION_FN[kind];
      ctx.strokeStyle = ACTIVATION_COLOR[kind];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= samples; s += 1) {
        const x = clampedXMin + s * step;
        const y = Math.max(yMin, Math.min(yMax, fn(x)));
        const px = xToPx(x);
        const py = yToPx(y);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      if (showDerivative) {
        const dfn = ACTIVATION_DERIVATIVE[kind];
        ctx.strokeStyle = ACTIVATION_COLOR[kind];
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let s = 0; s <= samples; s += 1) {
          const x = clampedXMin + s * step;
          const y = Math.max(yMin, Math.min(yMax, dfn(x)));
          const px = xToPx(x);
          const py = yToPx(y);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    if (showCursor && activeKinds.length > 0) {
      const cx = xToPx(safeCursorX);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, padTop);
      ctx.lineTo(cx, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      activeKinds.forEach((kind) => {
        const fn = ACTIVATION_FN[kind];
        const dfn = ACTIVATION_DERIVATIVE[kind];
        const yVal = fn(safeCursorX);
        const yDeriv = dfn(safeCursorX);

        const span = (clampedXMax - clampedXMin) * 0.12;
        const tx1 = safeCursorX - span;
        const tx2 = safeCursorX + span;
        const ty1 = yVal - yDeriv * span;
        const ty2 = yVal + yDeriv * span;

        ctx.strokeStyle = ACTIVATION_COLOR[kind];
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(xToPx(tx1), yToPx(Math.max(yMin, Math.min(yMax, ty1))));
        ctx.lineTo(xToPx(tx2), yToPx(Math.max(yMin, Math.min(yMax, ty2))));
        ctx.stroke();
        ctx.setLineDash([]);

        const yClamped = Math.max(yMin, Math.min(yMax, yVal));
        ctx.fillStyle = ACTIVATION_COLOR[kind];
        ctx.beginPath();
        ctx.arc(cx, yToPx(yClamped), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = bg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }, [enabled, showDerivative, showCursor, safeCursorX, clampedXMin, clampedXMax, height]);

  const activeKinds = useMemo(() => ALL_KINDS.filter((k) => enabled.has(k)), [enabled]);

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ALL_KINDS.map((kind) => {
          const isOn = enabled.has(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors',
                isOn
                  ? 'border-[var(--color-line-strong)] text-[var(--color-fg)]'
                  : 'border-[var(--color-line)] text-[var(--color-fg-dim)] opacity-50 hover:opacity-100',
              ].join(' ')}
              aria-pressed={isOn}
            >
              <span
                aria-hidden="true"
                className="inline-block h-[8px] w-[8px] rounded-sm"
                style={{ backgroundColor: ACTIVATION_COLOR[kind] }}
              />
              {ACTIVATION_LABEL[kind]}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          <input
            type="checkbox"
            checked={showDerivative}
            onChange={(e) => setShowDerivative(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          {derivativeLabel}
        </label>
        <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          <input
            type="checkbox"
            checked={showCursor}
            onChange={(e) => setShowCursor(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          {cursorLabel}
        </label>
      </div>

      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />

      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[11px] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase hover:text-[var(--color-fg)]">
          {xRangeLabel}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {minLabel} = <span className="text-[var(--color-accent)]">{clampedXMin.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={-10}
              max={0}
              step={0.5}
              value={clampedXMin}
              onChange={(e) => setXMin(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {maxLabel} = <span className="text-[var(--color-accent)]">{clampedXMax.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={clampedXMax}
              onChange={(e) => setXMax(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
        </div>
      </details>

      {showCursor && activeKinds.length > 0 && (
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              x = <span className="text-[var(--color-accent)]">{safeCursorX.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={clampedXMin}
              max={clampedXMax}
              step={0.05}
              value={safeCursorX}
              onChange={(e) => setCursorX(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-fg-muted)]">
                <th className="py-1.5 pr-3 tracking-[0.12em] uppercase">Fonction</th>
                <th className="py-1.5 pr-3 text-right tracking-[0.12em] uppercase">f(x)</th>
                <th className="py-1.5 text-right tracking-[0.12em] uppercase">f'(x)</th>
              </tr>
            </thead>
            <tbody>
              {activeKinds.map((kind) => (
                <tr key={kind} className="border-b border-[var(--color-line)] last:border-b-0">
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-fg)]">
                      <span aria-hidden="true" className="inline-block h-[3px] w-3 rounded-sm" style={{ backgroundColor: ACTIVATION_COLOR[kind] }} />
                      {ACTIVATION_LABEL[kind]}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--color-fg)]">
                    {formatNumber(ACTIVATION_FN[kind](safeCursorX))}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-[var(--color-fg)]">
                    {formatNumber(ACTIVATION_DERIVATIVE[kind](safeCursorX))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] italic text-[var(--color-fg-dim)]">
            Les segments en pointillés autour de chaque point sont les tangentes locales. Une tangente plate signifie un gradient faible (apprentissage lent) ; une tangente raide signifie un gradient fort.
          </p>
        </div>
      )}
    </figure>
  );
}
