import { useEffect, useRef, type JSX } from 'react';
import { readThemeColors, type ThemeColors } from '../../lib/generative/backdrop-support';
import type { Bounds, Pointer } from '../../lib/generative/flow-field';
import type { ArtConfig, PieceRenderer } from '../../lib/generative/pieces/piece';
import { findPiece } from '../../lib/generative/pieces/registry';

const MAX_PIXEL_RATIO = 2;
const STATIC_FRAME_COUNT = 200;

interface Props {
  pieceId: string;
  config: ArtConfig;
  interactive: boolean;
}

function structuralSignature(keys: string[], config: ArtConfig): string {
  return [config.seed, ...keys.map((key) => config[key])].join('|');
}

export default function ArtCanvas({ pieceId, config, interactive }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const configRef = useRef<ArtConfig>(config);
  const pointerRef = useRef<Pointer | null>(null);
  const colorsRef = useRef<ThemeColors>({ background: '#0a0a0a', foreground: '#fafafa', accent: '#ff6b35' });
  const rendererRef = useRef<PieceRenderer | null>(null);
  const boundsRef = useRef<Bounds>({ width: 0, height: 0 });

  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    const piece = findPiece(pieceId);
    if (canvas === null || piece === undefined) {
      return;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }

    // Capture narrowed references for use inside nested closures.
    const safeCanvas = canvas;
    const safeContext = context;
    const safePiece = piece;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    colorsRef.current = readThemeColors();
    const structuralKeys = safePiece.params.filter((param) => param.structural).map((param) => param.key);
    let lastSignature = structuralSignature(structuralKeys, configRef.current);
    let frameId = 0;
    let time = 0;

    function resetCanvas(): void {
      const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
      const width = safeCanvas.clientWidth;
      const height = safeCanvas.clientHeight;
      boundsRef.current = { width, height };
      safeCanvas.width = Math.max(1, Math.floor(width * pixelRatio));
      safeCanvas.height = Math.max(1, Math.floor(height * pixelRatio));
      safeContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      safeContext.fillStyle = colorsRef.current.background;
      safeContext.fillRect(0, 0, width, height);
      rendererRef.current = safePiece.createRenderer(configRef.current, boundsRef.current, Math.random);
      lastSignature = structuralSignature(structuralKeys, configRef.current);
    }

    function drawFrame(): void {
      const renderer = rendererRef.current;
      if (renderer === null) {
        return;
      }
      const signature = structuralSignature(structuralKeys, configRef.current);
      if (signature !== lastSignature) {
        lastSignature = signature;
        renderer.resize(boundsRef.current, configRef.current, Math.random);
        safeContext.fillStyle = colorsRef.current.background;
        safeContext.fillRect(0, 0, boundsRef.current.width, boundsRef.current.height);
      }
      time += safePiece.timeIncrement;
      renderer.renderFrame(
        {
          context: safeContext,
          bounds: boundsRef.current,
          colors: colorsRef.current,
          pointer: pointerRef.current,
          time,
          random: Math.random,
        },
        configRef.current,
      );
    }

    function renderStaticArtwork(): void {
      for (let frame = 0; frame < STATIC_FRAME_COUNT; frame++) {
        drawFrame();
      }
    }

    function loop(): void {
      drawFrame();
      frameId = window.requestAnimationFrame(loop);
    }

    function start(): void {
      if (frameId === 0 && !document.hidden) {
        frameId = window.requestAnimationFrame(loop);
      }
    }

    function stop(): void {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }

    resetCanvas();
    if (prefersReducedMotion) {
      renderStaticArtwork();
    }

    const resizeObserver = new ResizeObserver(() => {
      resetCanvas();
      if (prefersReducedMotion) {
        renderStaticArtwork();
      }
    });
    resizeObserver.observe(safeCanvas);

    const themeObserver = new MutationObserver(() => {
      colorsRef.current = readThemeColors();
      if (prefersReducedMotion) {
        renderStaticArtwork();
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (prefersReducedMotion) {
        return;
      }
      if (entries.some((entry) => entry.isIntersecting)) {
        start();
      } else {
        stop();
      }
    });
    intersectionObserver.observe(safeCanvas);

    const onVisibility = (): void => {
      if (prefersReducedMotion) {
        return;
      }
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      const rect = safeCanvas.getBoundingClientRect();
      pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = (): void => {
      pointerRef.current = null;
    };
    if (interactive) {
      safeCanvas.addEventListener('pointermove', onPointerMove);
      safeCanvas.addEventListener('pointerleave', onPointerLeave);
    }

    if (!prefersReducedMotion) {
      start();
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (interactive) {
        safeCanvas.removeEventListener('pointermove', onPointerMove);
        safeCanvas.removeEventListener('pointerleave', onPointerLeave);
      }
    };
    // config is intentionally read via configRef.current so the animation loop is not restarted on every slider change
  }, [pieceId, interactive]);

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />;
}
