import { useEffect, useState, type JSX } from 'react';
import ArtCanvas from './ArtCanvas';
import ControlPanel, { type AtelierLabels, type ExportPreset } from './ControlPanel';
import { exportPieceToPng } from './export-png';
import { dailySeed } from '../../lib/generative/flow-field';
import {
  decodeConfig,
  defaultConfig,
  encodeConfig,
  randomConfig,
  randomSeed,
} from '../../lib/generative/pieces/art-config';
import { findPiece } from '../../lib/generative/pieces/registry';
import type { ArtConfig } from '../../lib/generative/pieces/piece';

interface Props {
  pieceId: string;
  locale: 'fr' | 'en';
  labels: AtelierLabels;
}

/** Full-page atelier: canvas + control panel, wired to URL state and the daily seed. */
export default function Atelier({ pieceId, locale, labels }: Props): JSX.Element {
  const piece = findPiece(pieceId);
  const [config, setConfig] = useState<ArtConfig>(() =>
    piece === undefined
      ? { seed: 0 }
      : defaultConfig(piece.params, piece.defaults, dailySeed(new Date())),
  );
  const [generation, setGeneration] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (piece === undefined) {
      return;
    }
    const decoded = decodeConfig(
      window.location.search,
      piece.params,
      piece.defaults,
      dailySeed(new Date()),
    );
    setConfig(decoded);
    setGeneration((value) => value + 1);
  }, [piece]);

  if (piece === undefined) {
    return <div />;
  }

  const setParam = (key: string, value: number): void => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const surprise = (): void => {
    setConfig(randomConfig(piece.params, Math.random, randomSeed(Math.random)));
    setGeneration((value) => value + 1);
  };

  const share = (): void => {
    const query = encodeConfig(config, piece.params);
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
    if (navigator.clipboard !== undefined) {
      void navigator.clipboard.writeText(window.location.href);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const exportPng = (preset: ExportPreset): void => {
    exportPieceToPng(piece.id, config, preset.width, preset.height);
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] lg:aspect-auto lg:min-h-[60vh]">
        <ArtCanvas pieceId={piece.id} config={config} interactive />
      </div>
      <ControlPanel
        piece={piece}
        config={config}
        generation={generation}
        locale={locale}
        labels={labels}
        copied={copied}
        onParamChange={setParam}
        onSurprise={surprise}
        onShare={share}
        onExport={exportPng}
      />
    </div>
  );
}
