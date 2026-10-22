/** Screen-space helpers shared by the dice and draw animations. */

export interface Point {
  x: number;
  y: number;
}

const EDGE_PX = 40;

export function visibleRect(selector: string): DOMRect | null {
  for (const element of document.querySelectorAll(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export function centerOf(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Viewport area not covered by the phone/tablet hand dock. */
export function visibleBottom(): number {
  const dock = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--mdock-h'),
  );
  return window.innerHeight - (Number.isFinite(dock) ? dock : 0);
}

export function clampToViewport(point: Point, edge = EDGE_PX): Point {
  return {
    x: Math.min(Math.max(point.x, edge), window.innerWidth - edge),
    y: Math.min(Math.max(point.y, edge), visibleBottom() - edge),
  };
}

export function isFullyVisible(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= visibleBottom() &&
    rect.right <= window.innerWidth
  );
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
