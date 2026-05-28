import { useEffect, useRef, useState, type JSX } from 'react';

type ActivationKind = 'identity' | 'sigmoid' | 'relu' | 'tanh';

interface Props {
  functions: ActivationKind[];
  showDerivative?: boolean;
  range?: [number, number];
  height?: number;
}

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

export default function ActivationPlotter({
  functions,
  showDerivative: showDerivativeInit = false,
  range = [-5, 5],
  height = 240,
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showDerivative, setShowDerivative] = useState<boolean>(showDerivativeInit);

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

    const [xMin, xMax] = range;
    const yMin = -1.5;
    const yMax = 1.5;
    const padLeft = 36;
    const padRight = 8;
    const padTop = 12;
    const padBottom = 24;
    const plotW = cssWidth - padLeft - padRight;
    const plotH = cssHeight - padTop - padBottom;

    const xToPx = (x: number): number => padLeft + ((x - xMin) / (xMax - xMin)) * plotW;
    const yToPx = (y: number): number => padTop + (1 - (y - yMin) / (yMax - yMin)) * plotH;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = Math.ceil(xMin); gx <= xMax; gx += 1) {
      const px = xToPx(gx);
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
    const yZero = yToPx(0);
    ctx.moveTo(padLeft, yZero);
    ctx.lineTo(padLeft + plotW, yZero);
    const xZero = xToPx(0);
    ctx.moveTo(xZero, padTop);
    ctx.lineTo(xZero, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = fgDim;
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ['-1', '0', '1'].forEach((label, i) => {
      const yVal = i === 0 ? -1 : i === 1 ? 0 : 1;
      ctx.fillText(label, padLeft - 6, yToPx(yVal) + 4);
    });
    ctx.textAlign = 'center';
    [xMin, 0, xMax].forEach((xVal) => {
      ctx.fillText(String(xVal), xToPx(xVal), padTop + plotH + 14);
    });

    const samples = Math.max(120, Math.floor(plotW));
    const step = (xMax - xMin) / samples;

    functions.forEach((kind) => {
      const fn = ACTIVATION_FN[kind];
      ctx.strokeStyle = ACTIVATION_COLOR[kind];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= samples; s += 1) {
        const x = xMin + s * step;
        const y = fn(x);
        const yClamped = Math.max(yMin, Math.min(yMax, y));
        const px = xToPx(x);
        const py = yToPx(yClamped);
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
          const x = xMin + s * step;
          const y = dfn(x);
          const yClamped = Math.max(yMin, Math.min(yMax, y));
          const px = xToPx(x);
          const py = yToPx(yClamped);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [functions, range, height, showDerivative]);

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-3">
          {functions.map((kind) => (
            <li key={kind} className="flex items-center gap-2 font-mono text-[12px] text-[var(--color-fg-muted)]">
              <span
                aria-hidden="true"
                className="inline-block h-[2px] w-5"
                style={{ backgroundColor: ACTIVATION_COLOR[kind] }}
              />
              {ACTIVATION_LABEL[kind]}
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          <input
            type="checkbox"
            checked={showDerivative}
            onChange={(e) => setShowDerivative(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Dérivée
        </label>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />
    </figure>
  );
}
