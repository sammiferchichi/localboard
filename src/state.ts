import type { AppState, WhiteboardElement, Viewport } from './types'
import { logger } from './logger'
import { normalizeElement } from './elements'

const MAX_HISTORY = 100

export type Listener = () => void

export class StateManager {
  state: AppState
  private undoStack: WhiteboardElement[][] = []
  private redoStack: WhiteboardElement[][] = []
  private listeners: Set<Listener> = new Set()
  private _saving = false

  constructor(initial: AppState) {
    this.state = initial
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    for (const fn of this.listeners) fn()
  }

  get elements(): WhiteboardElement[] { return this.state.elements }
  get viewport(): Viewport { return this.state.viewport }
  get selectedIds(): Set<string> { return this.state.selectedIds }

  commitHistory(): void {
    this.undoStack.push(this.state.elements.map(e => ({ ...e })))
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift()
    this.redoStack = []
    this._saving = true
    this.notify()
    logger.debug('history committed, total:', this.undoStack.length)
  }

  updateElements(elements: WhiteboardElement[]): void {
    this.state.elements = elements
    this._saving = true
    this.notify()
  }

  setViewport(vp: Partial<Viewport>): void {
    Object.assign(this.state.viewport, vp)
    this.notify()
  }

  select(id: string | null, toggle = false): void {
    if (id === null) {
      this.state.selectedIds.clear()
    } else if (toggle) {
      if (this.state.selectedIds.has(id)) this.state.selectedIds.delete(id)
      else this.state.selectedIds.add(id)
    } else {
      this.state.selectedIds.clear()
      this.state.selectedIds.add(id)
    }
    this.notify()
  }

  selectNone(): void {
    this.state.selectedIds.clear()
    this.notify()
  }

  setTool(tool: AppState['tool']): void {
    this.state.tool = tool
    this.notify()
  }

  setStrokeColor(color: string): void { this.state.strokeColor = color }
  setFillColor(color: string): void { this.state.fillColor = color }
  setStrokeWidth(w: number): void { this.state.strokeWidth = w }

  undo(): void {
    if (this.undoStack.length === 0) return
    this.redoStack.push(this.state.elements.map(e => ({ ...e })))
    const prev = this.undoStack.pop()!
    this.state.elements = prev.map(e => ({ ...e }))
    for (const el of this.state.elements) normalizeElement(el)
    this._saving = true
    this.notify()
    logger.debug('undo')
  }

  redo(): void {
    if (this.redoStack.length === 0) return
    this.undoStack.push(this.state.elements.map(e => ({ ...e })))
    const next = this.redoStack.pop()!
    this.state.elements = next.map(e => ({ ...e }))
    for (const el of this.state.elements) normalizeElement(el)
    this._saving = true
    this.notify()
    logger.debug('redo')
  }

  canUndo(): boolean { return this.undoStack.length > 0 }
  canRedo(): boolean { return this.redoStack.length > 0 }
  needsSave(): boolean {
    if (this._saving) { this._saving = false; return true }
    return false
  }
}
