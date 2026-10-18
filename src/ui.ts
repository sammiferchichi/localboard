import type { ToolType, WhiteboardElement } from './types'
import { StateManager } from './state'
import { Renderer } from './renderer'
import { createElement } from './elements'

export interface UIDeps {
  state: StateManager
  renderer: Renderer
  onToolChange: (tool: ToolType) => void
  scheduleRender: () => void
}

let deps: UIDeps
let textArea: HTMLTextAreaElement
let statusInfo: HTMLElement
let undoBtn: HTMLButtonElement
let redoBtn: HTMLButtonElement
let activeTextEl: WhiteboardElement | null = null

let ctxMenu: HTMLElement

export function initUI(d: UIDeps): void {
  deps = d
  textArea = document.getElementById('text-editor') as HTMLTextAreaElement
  statusInfo = document.getElementById('status-info') as HTMLElement
  undoBtn = document.getElementById('undo') as HTMLButtonElement
  redoBtn = document.getElementById('redo') as HTMLButtonElement
  ctxMenu = document.getElementById('ctx-menu')!

  setupToolbar()
  setupTextEditor()
  setupUndoRedo()
  setupColorControls()
  setupClear()
  setupContextMenu()

  deps.state.onChange(updateUI)
  updateUI()
}

function setActiveTool(tool: ToolType): void {
  const toolbar = document.getElementById('toolbar')!
  toolbar.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'))
  const btn = toolbar.querySelector(`[data-tool="${tool}"]`) as HTMLButtonElement
  if (btn) btn.classList.add('active')
  deps.onToolChange(tool)
}

function setupToolbar(): void {
  const toolbar = document.getElementById('toolbar')!
  toolbar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-tool]') as HTMLButtonElement
    if (!btn) return
    setActiveTool(btn.dataset.tool as ToolType)
  })
}

function setupTextEditor(): void {
  textArea.addEventListener('blur', commitText)
  textArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      textArea.blur()
    }
    if (e.key === 'Escape') {
      textArea.value = ''
      e.preventDefault()
      textArea.blur()
    }
  })
}

function setupUndoRedo(): void {
  undoBtn.addEventListener('click', () => deps.state.undo())
  redoBtn.addEventListener('click', () => deps.state.redo())
}

function setupColorControls(): void {
  const strokeInput = document.getElementById('strokeColor') as HTMLInputElement
  const fillInput = document.getElementById('fillColor') as HTMLInputElement
  const widthInput = document.getElementById('strokeWidth') as HTMLInputElement
  strokeInput.addEventListener('input', () => deps.state.setStrokeColor(strokeInput.value))
  fillInput.addEventListener('input', () => deps.state.setFillColor(fillInput.value))
  widthInput.addEventListener('input', () => deps.state.setStrokeWidth(Number(widthInput.value)))
}

function setupClear(): void {
  document.getElementById('clear')!.addEventListener('click', () => {
    if (deps.state.elements.length === 0) return
    if (confirm('Clear all elements?')) {
      deps.state.elements.length = 0
      deps.state.selectedIds.clear()
      deps.state.updateElements(deps.state.elements)
      deps.state.commitHistory()
    }
  })
}

const _mc = document.createElement('canvas').getContext('2d')!

function measureText(text: string, fontSize: number): { width: number; height: number } {
  _mc.font = `${fontSize}px system-ui, sans-serif`
  const lines = text.split('\n')
  let maxW = 0
  for (const line of lines) {
    maxW = Math.max(maxW, _mc.measureText(line).width)
  }
  return { width: maxW, height: fontSize * 1.2 * lines.length }
}

function commitText(): void {
  if (!activeTextEl) return
  activeTextEl.text = textArea.value
  activeTextEl.opacity = 1
  textArea.style.display = 'none'

  const isNew = !deps.state.elements.includes(activeTextEl)
  if (activeTextEl.text.trim()) {
    const { width, height } = measureText(activeTextEl.text, activeTextEl.fontSize || 20)
    activeTextEl.width = width
    activeTextEl.height = height
    if (isNew) deps.state.elements.push(activeTextEl)
    deps.state.updateElements(deps.state.elements)
    deps.state.commitHistory()
  } else if (!isNew) {
    const idx = deps.state.elements.indexOf(activeTextEl)
    if (idx >= 0) deps.state.elements.splice(idx, 1)
    deps.state.updateElements(deps.state.elements)
    deps.state.commitHistory()
  }
  activeTextEl = null
}

export function commitPendingText(): void {
  if (textArea.style.display !== 'none') {
    textArea.blur()
  }
}

export function showTextEditor(clientX: number, clientY: number, el: WhiteboardElement): void {
  activeTextEl = el
  // Hide existing element on canvas while editing to prevent overlap
  if (deps.state.elements.includes(el)) {
    el.opacity = 0
    deps.state.updateElements(deps.state.elements)
  }
  textArea.value = el.text || ''
  textArea.style.display = 'block'
  textArea.style.left = `${clientX}px`
  textArea.style.top = `${clientY}px`
  textArea.style.fontSize = `${el.fontSize || 20}px`
  textArea.style.color = el.strokeColor
  textArea.style.minWidth = `${Math.max(100, el.width || 100)}px`
  textArea.style.minHeight = `${Math.max(30, el.height || 30)}px`
  textArea.focus()
  textArea.select()
}

export function handleTextClick(clientX: number, clientY: number, worldX: number, worldY: number): void {
  const el = createElement('text', worldX, worldY, deps.state.state.strokeColor, deps.state.state.fillColor, deps.state.state.strokeWidth)
  el.text = ''
  el.fontSize = 20
  showTextEditor(clientX, clientY, el)
}

function setupContextMenu(): void {
  ctxMenu.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLButtonElement
    if (!btn) return
    if (btn.dataset.action === 'delete') {
      const ids = deps.state.selectedIds
      if (ids.size > 0) {
        const filtered = deps.state.elements.filter(el => !ids.has(el.id))
        deps.state.selectedIds.clear()
        deps.state.updateElements(filtered)
        deps.state.commitHistory()
        deps.scheduleRender()
      }
    } else if (btn.dataset.action === 'select') {
      if (deps.state.selectedIds.size > 0) {
        setActiveTool('select')
      }
    }
    hideContextMenu()
  })

  document.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return
    if (ctxMenu.style.display === 'none') return
    if (ctxMenu.contains(e.target as Node)) return
    hideContextMenu()
  })
}

export function hideContextMenu(): void {
  ctxMenu.style.display = 'none'
}

export function showContextMenu(clientX: number, clientY: number): void {
  ctxMenu.style.display = 'block'
  ctxMenu.style.left = `${Math.min(clientX, window.innerWidth - 130)}px`
  ctxMenu.style.top = `${Math.min(clientY, window.innerHeight - 50)}px`
}

function updateUI(): void {
  const s = deps.state.state
  statusInfo.textContent = `Zoom: ${Math.round(s.viewport.zoom * 100)}% | Elements: ${s.elements.length}`
  undoBtn.disabled = !deps.state.canUndo()
  redoBtn.disabled = !deps.state.canRedo()
}
