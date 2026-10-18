export type ToolType = 'select' | 'rectangle' | 'ellipse' | 'line' | 'freehand' | 'text' | 'pan'
export type ElementType = 'rectangle' | 'ellipse' | 'line' | 'freehand' | 'text'

export interface Point {
  x: number
  y: number
}

export interface WhiteboardElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  points?: Point[]
  text?: string
  fontSize?: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface AppState {
  elements: WhiteboardElement[]
  viewport: Viewport
  selectedIds: Set<string>
  tool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
}

export interface ToolHandlers {
  onPointerDown(e: PointerEvent, pos: Point, worldPos: Point): void
  onPointerMove(e: PointerEvent, pos: Point, worldPos: Point): void
  onPointerUp(e: PointerEvent, pos: Point, worldPos: Point): void
}
