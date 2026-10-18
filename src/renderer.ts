import type { WhiteboardElement, Viewport } from './types'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private dpr: number
  private _zoom = 1

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
  }

  resize(): void {
    const { canvas } = this
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = w * this.dpr
    canvas.height = h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  render(elements: WhiteboardElement[], viewport: Viewport, selectedIds: Set<string>, draft: WhiteboardElement | null): void {
    const { ctx, canvas } = this
    this._zoom = viewport.zoom
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(viewport.x, viewport.y)
    ctx.scale(viewport.zoom, viewport.zoom)
    for (const el of elements) {
      this.drawElement(el)
      if (selectedIds.has(el.id)) this.drawSelection(el)
    }
    if (draft) {
      this.drawElement(draft)
    }
    ctx.restore()
  }

  private drawElement(el: WhiteboardElement): void {
    const { ctx } = this
    ctx.save()
    ctx.globalAlpha = el.opacity
    if (el.rotation) {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2
      ctx.translate(cx, cy)
      ctx.rotate(el.rotation)
      ctx.translate(-cx, -cy)
    }
    switch (el.type) {
      case 'rectangle': this.drawRect(el); break
      case 'ellipse': this.drawEllipse(el); break
      case 'line': this.drawLine(el); break
      case 'freehand': this.drawFreehand(el); break
      case 'text': this.drawText(el); break
    }
    ctx.restore()
  }

  private drawRect(el: WhiteboardElement): void {
    const { ctx } = this
    const x = Math.min(el.x, el.x + el.width), y = Math.min(el.y, el.y + el.height)
    const w = Math.abs(el.width), h = Math.abs(el.height)
    if (el.fillColor && el.fillColor !== 'transparent') {
      ctx.fillStyle = el.fillColor
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeStyle = el.strokeColor
    ctx.lineWidth = el.strokeWidth
    ctx.strokeRect(x, y, w, h)
  }

  private drawEllipse(el: WhiteboardElement): void {
    const { ctx } = this
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    const rx = Math.abs(el.width) / 2, ry = Math.abs(el.height) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2)
    if (el.fillColor && el.fillColor !== 'transparent') {
      ctx.fillStyle = el.fillColor
      ctx.fill()
    }
    ctx.strokeStyle = el.strokeColor
    ctx.lineWidth = el.strokeWidth
    ctx.stroke()
  }

  private drawLine(el: WhiteboardElement): void {
    const { ctx } = this
    if (!el.points || el.points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.strokeStyle = el.strokeColor
    ctx.lineWidth = el.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  private drawFreehand(el: WhiteboardElement): void {
    this.drawLine(el)
  }

  private drawText(el: WhiteboardElement): void {
    const { ctx } = this
    if (!el.text) return
    ctx.font = `${el.fontSize || 20}px system-ui, sans-serif`
    ctx.fillStyle = el.strokeColor
    const lines = el.text.split('\n')
    const lineH = (el.fontSize || 20) * 1.2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], el.x, el.y + (i + 1) * lineH)
    }
  }

  private drawSelection(el: WhiteboardElement): void {
    const { ctx } = this
    const { x, y, w, h } = this.getBounds(el)
    const s = 1 / this._zoom
    ctx.strokeStyle = '#4a6cf7'
    ctx.lineWidth = 2 * s
    ctx.setLineDash([6 * s, 4 * s])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
    const hs = 6 * s
    for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#4a6cf7'
      ctx.lineWidth = 1.5 * s
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs)
    }
  }

  private getBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
    const halfStroke = el.strokeWidth / 2
    const pad = 4
    return {
      x: Math.min(el.x, el.x + el.width) - halfStroke - pad,
      y: Math.min(el.y, el.y + el.height) - halfStroke - pad,
      w: Math.abs(el.width) + el.strokeWidth + pad * 2,
      h: Math.abs(el.height) + el.strokeWidth + pad * 2,
    }
  }
}
