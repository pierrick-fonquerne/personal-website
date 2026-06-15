import { type JSX } from 'react';
import InteractiveSlider from '../learning/InteractiveSlider';
import type { ArtConfig, GenerativePiece } from '../../lib/generative/pieces/piece';

export interface AtelierLabels {
  surprise: string;
  exportPng: string;
  copyLink: string;
  copied: string;
}

export interface ExportPreset {
  label: string;
  width: number;
  height: number;
}

const EXPORT_PRESETS: ExportPreset[] = [
  { label: '1920 x 1080', width: 1920, height: 1080 },
  { label: '2560 x 1440', width: 2560, height: 1440 },
];

interface Props {
  piece: GenerativePiece;
  config: ArtConfig;
  generation: number;
  locale: 'fr' | 'en';
  labels: AtelierLabels;
  copied: boolean;
  onParamChange: (key: string, value: number) => void;
  onSurprise: () => void;
  onShare: () => void;
  onExport: (preset: ExportPreset) => void;
}

const buttonClass =
  'w-full rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-[12px] text-[var(--color-fg)] transition-colors hover:bg-[var(--color-hover)]';

/** Side panel with per-parameter sliders and action buttons for the art atelier. */
export default function ControlPanel({
  piece,
  config,
  generation,
  locale,
  labels,
  copied,
  onParamChange,
  onSurprise,
  onShare,
  onExport,
}: Props): JSX.Element {
  return (
    <aside className="flex flex-col gap-2">
      {piece.params.map((param) => (
        <InteractiveSlider
          key={`${piece.id}-${param.key}-${generation}`}
          label={locale === 'fr' ? param.labelFr : param.labelEn}
          min={param.min}
          max={param.max}
          step={param.step}
          defaultValue={config[param.key]}
          onChange={(value) => onParamChange(param.key, value)}
        />
      ))}

      <button type="button" className={buttonClass} onClick={onSurprise}>
        {labels.surprise}
      </button>
      <button type="button" className={buttonClass} onClick={onShare}>
        {copied ? labels.copied : labels.copyLink}
      </button>
      <div className="flex gap-2">
        {EXPORT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={buttonClass}
            onClick={() => onExport(preset)}
          >
            {labels.exportPng} {preset.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
