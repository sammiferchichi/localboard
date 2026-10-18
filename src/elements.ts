import type { WhiteboardElement, ElementType } from './types'

let _idCounter = 0
export function generateId(): string {
  return `e${++_idCounter}_${Date.now().toString(36)}`
}

export function createElement(
  type: ElementType,
  x: number,
  y: number,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number
): WhiteboardElement {
  return {
    id: generateId(),
    type,
    x, y,
    width: 0,
    height: 0,
    rotation: 0,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity: 1,
    fontSize: type === 'text' ? 20 : undefined,
    text: type === 'text' ? '' : undefined,
    points: (type === 'freehand' || type === 'line') ? [{ x, y }] : undefined,
  }
}

export function normalizeElement(el: WhiteboardElement): void {
  if (el.width < 0) { el.x += el.width; el.width = -el.width }
  if (el.height < 0) { el.y += el.height; el.height = -el.height }
}

export function getElementBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  const pad = Math.max(el.strokeWidth / 2, 6)
  return {
    x: Math.min(el.x, el.x + el.width) - pad,
    y: Math.min(el.y, el.y + el.height) - pad,
    w: Math.abs(el.width) + pad * 2,
    h: Math.abs(el.height) + pad * 2,
  }
}

export function hitTestElement(el: WhiteboardElement, wx: number, wy: number): boolean {
  const { x, y, w, h } = getElementBounds(el)
  if (el.type === 'freehand' || el.type === 'line') {
    if (!el.points) return false
    for (let i = 1; i < el.points.length; i++) {
      const p0 = el.points[i - 1], p1 = el.points[i]
      const d = distToSegment(wx, wy, p0.x, p0.y, p1.x, p1.y)
      if (d < Math.max(el.strokeWidth + 4, 8)) return true
    }
    return false
  }
  return wx >= x && wx <= x + w && wy >= y && wy <= y + h
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function cloneElement(el: WhiteboardElement): WhiteboardElement {
  return {
    ...el,
    id: generateId(),
    points: el.points ? el.points.map(p => ({ ...p })) : undefined,
  }
}
