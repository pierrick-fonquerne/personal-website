import { useState, type JSX } from 'react';

interface Props {
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  formatValue?: (value: number) => string;
  onChange?: (value: number) => void;
}

export default function InteractiveSlider({
  label,
  min,
  max,
  step = 1,
  defaultValue,
  unit,
  formatValue,
  onChange,
}: Props): JSX.Element {
  const [value, setValue] = useState<number>(defaultValue);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const next = Number(event.target.value);
    setValue(next);
    onChange?.(next);
  };

  const display = formatValue ? formatValue(value) : `${value}${unit ?? ''}`;

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="font-mono text-[12px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          {label}
        </label>
        <span className="font-mono text-[14px] font-medium text-[var(--color-accent)] tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full accent-[var(--color-accent)]"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--color-fg-dim)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
