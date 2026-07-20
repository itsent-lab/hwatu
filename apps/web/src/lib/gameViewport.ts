import { useEffect, useState, type CSSProperties } from 'react';

const REFERENCE_HEIGHT = 720;
const SCALE_BELOW_HEIGHT = 620;
const HAND_DOCK_HEIGHT = 170;

export interface GameViewportFit {
  scale: number;
  logicalWidth: number;
  logicalHeight: number;
  dockHeight: number;
}

export function resolveGameViewportSize(
  width: number,
  height: number,
  visualViewport?: { width: number; height: number } | null
) {
  if (!visualViewport) return { width, height };
  return { width: visualViewport.width, height: visualViewport.height };
}

export function calculateGameViewportFit(width: number, height: number): GameViewportFit | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= height || height >= SCALE_BELOW_HEIGHT) return null;
  const scale = Math.min(1, height / REFERENCE_HEIGHT);
  const logicalWidth = width / scale;
  return {
    scale,
    logicalWidth,
    logicalHeight: REFERENCE_HEIGHT,
    dockHeight: HAND_DOCK_HEIGHT
  };
}

function currentFit() {
  if (typeof window === 'undefined') return null;
  const viewport = resolveGameViewportSize(window.innerWidth, window.innerHeight, window.visualViewport);
  return calculateGameViewportFit(viewport.width, viewport.height);
}

export function useGameViewportFit(): { className: string; style?: CSSProperties } {
  const [fit, setFit] = useState<GameViewportFit | null>(currentFit);
  useEffect(() => {
    const update = () => setFit(currentFit());
    document.documentElement.classList.add('game-viewport-active');
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    update();
    return () => {
      document.documentElement.classList.remove('game-viewport-active');
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  if (!fit) return { className: 'game-page' };
  return {
    className: 'game-page scaled-game-page',
    style: {
      '--game-scale': String(fit.scale),
      '--game-logical-width': `${fit.logicalWidth}px`,
      '--game-logical-height': `${fit.logicalHeight}px`,
      '--scaled-bottom-dock-height': `${fit.dockHeight}px`
    } as CSSProperties
  };
}
