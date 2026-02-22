// WHUT OS V3 — Smart Layout Engine
// Auto-positions cards based on priority and count

import type { Card } from './card-types';

const SIDEBAR_W = 200; // px — sidebar width
const INPUT_H = 80;    // px — input bar height

export function layoutCards(cards: Card[]): Card[] {
  if (cards.length === 0) return [];

  // Sort by priority (1 first)
  const sorted = [...cards].sort((a, b) => a.priority - b.priority);

  const primary = sorted.filter(c => c.priority === 1);
  const secondary = sorted.filter(c => c.priority === 2);
  const tertiary = sorted.filter(c => c.priority === 3);

  const positioned: Card[] = [];

  if (sorted.length === 1) {
    // Single card: centered in content area (offset for sidebar)
    positioned.push({
      ...sorted[0],
      position: { x: 45, y: 40 },
      size: sorted[0].size || 'large',
    });
  } else if (sorted.length === 2) {
    // Two cards: side by side
    positioned.push({
      ...sorted[0],
      position: { x: 32, y: 42 },
      size: 'medium',
    });
    positioned.push({
      ...sorted[1],
      position: { x: 68, y: 42 },
      size: 'medium',
    });
  } else {
    // 3+: primary centered top, secondaries in row below, tertiaries at edges

    // Primary cards — centered row at top
    if (primary.length === 1) {
      positioned.push({
        ...primary[0],
        position: { x: 50, y: 30 },
        size: 'large',
      });
    } else {
      primary.forEach((c, i) => {
        const xSpread = 70 / Math.max(primary.length, 1);
        positioned.push({
          ...c,
          position: { x: 30 + (i + 0.5) * xSpread, y: 28 },
          size: 'medium',
        });
      });
    }

    // Secondary cards — row below primary
    secondary.forEach((c, i) => {
      const cols = secondary.length;
      const xSpread = 70 / Math.max(cols, 1);
      positioned.push({
        ...c,
        position: { x: 30 + (i + 0.5) * xSpread, y: 62 },
        size: cols > 2 ? 'small' : 'medium',
      });
    });

    // Tertiary cards — small, along the right edge
    tertiary.forEach((c, i) => {
      positioned.push({
        ...c,
        position: { x: 85, y: 20 + i * 18 },
        size: 'small',
      });
    });
  }

  return positioned;
}

// Size to CSS dimensions
export function cardSizeToCss(size: string): { width: string; maxHeight: string } {
  switch (size) {
    case 'small':
      return { width: '280px', maxHeight: '300px' };
    case 'medium':
      return { width: '400px', maxHeight: '450px' };
    case 'large':
      return { width: '560px', maxHeight: '600px' };
    case 'full':
      return { width: '90vw', maxHeight: '80vh' };
    default:
      return { width: '400px', maxHeight: '450px' };
  }
}
