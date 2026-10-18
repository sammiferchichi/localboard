import { Renderer } from './renderer'
import { StateManager } from './state'
import type { ToolType, ToolHandlers, Viewport, Point, WhiteboardElement } from './types'
import { createToolHandlers, getDraft } from './tools'
import { loadFromStorage, saveToStorage } from './storage'
import { initUI, handleTextClick, commitPendingText, showTextEditor, showContextMenu, hideContextMenu } from './ui'
import { hitTestElement } from './elements'
import { logger, setLogLevel } from './logger'

setLogLevel('info')

function s2w(sx: number, sy: number, vp: Viewport): Point {
  return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom }
}

async function main(): Promise<void> {
  const saved = await loadFromStorage()
  const state = new StateManager({
    elements: saved?.elements ?? [],
    viewport: saved?.viewport ?? { x: 0, y: 0, zoom: 1 },
    selectedIds: new Set<string>(),
    tool: 'select',
    strokeColor: '#1a1a2e',
    fillColor: '#e2e2e2',
    strokeWidth: 3,
  })

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const renderer = new Renderer(canvas)

  let currentTool: ToolHandlers = createToolHandlers('select', state)

  function changeTool(tool: ToolType): void {
    commitPendingText()
    state.setTool(tool)
    currentTool = createToolHandlers(tool, state)
    canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'text' ? 'text' : 'crosshair'
  }

  function scheduleRender(): void {
    renderer.render(state.elements, state.viewport, state.selectedIds, getDraft())
  }

  initUI({ state, renderer, onToolChange: changeTool, scheduleRender })

  const ro = new ResizeObserver(() => { renderer.resize(); scheduleRender() })
  ro.observe(canvas)
  renderer.resize()
  scheduleRender()

  let _lastClick = 0, _lastSX = 0, _lastSY = 0

  canvas.addEventListener('pointerdown', (e) => {
    commitPendingText()
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const wp = s2w(sx, sy, state.viewport)

    const now = Date.now()
    if (now - _lastClick < 500 && Math.abs(sx - _lastSX) < 12 && Math.abs(sy - _lastSY) < 12) {
      _lastClick = 0
      for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i]
        if (el.type === 'text' && hitTestElement(el, wp.x, wp.y)) {
          const fs = el.fontSize || 20
          const cx = rect.left + el.x * state.viewport.zoom + state.viewport.x
          const cy = rect.top + (el.y + fs * 0.4) * state.viewport.zoom + state.viewport.y
          showTextEditor(cx, cy, el)
          break
        }
      }
      return
    }
    _lastClick = now; _lastSX = sx; _lastSY = sy

    if (state.state.tool === 'text') {
      let hit: WhiteboardElement | null = null
      for (let i = state.elements.length - 1; i >= 0; i--) {
        if (hitTestElement(state.elements[i], wp.x, wp.y)) { hit = state.elements[i]; break }
      }
      if (hit && hit.type === 'text') {
        state.select(hit.id)
      } else if (!hit) {
        handleTextClick(e.clientX, e.clientY, wp.x, wp.y)
      }
      return
    }
    currentTool.onPointerDown(e, { x: sx, y: sy }, wp)
  })

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const wp = s2w(sx, sy, state.viewport)
    if (state.state.tool !== 'text') {
      currentTool.onPointerMove(e, { x: sx, y: sy }, wp)
    }
    scheduleRender()
  })

  canvas.addEventListener('pointerup', (e) => {
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const wp = s2w(sx, sy, state.viewport)
    currentTool.onPointerUp(e, { x: sx, y: sy }, wp)
    scheduleRender()
  })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * delta))
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    state.setViewport({
      zoom: newZoom,
      x: mx - (mx - state.viewport.x) * (newZoom / state.viewport.zoom),
      y: my - (my - state.viewport.y) * (newZoom / state.viewport.zoom),
    })
    scheduleRender()
  })

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    commitPendingText()
    hideContextMenu()
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const wp = s2w(sx, sy, state.viewport)
    let hit: WhiteboardElement | null = null
    for (let i = state.elements.length - 1; i >= 0; i--) {
      if (hitTestElement(state.elements[i], wp.x, wp.y)) { hit = state.elements[i]; break }
    }
    if (hit) {
      if (!state.selectedIds.has(hit.id)) state.select(hit.id)
      showContextMenu(e.clientX, e.clientY)
    }
  })

  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName ?? '')
    if (tag === 'TEXTAREA' || tag === 'INPUT') return

    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault(); state.undo(); scheduleRender()
    } else if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'Z')) {
      e.preventDefault(); state.redo(); scheduleRender()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = state.selectedIds
      if (ids.size > 0) {
        const filtered = state.elements.filter(el => !ids.has(el.id))
        state.selectedIds.clear()
        state.updateElements(filtered)
        state.commitHistory()
        scheduleRender()
      }
    } else if (e.key === 'Escape') {
      state.select(null)
      scheduleRender()
    }
  })

  state.onChange(() => scheduleRender())

  setInterval(() => {
    if (state.needsSave()) {
      saveToStorage(state.elements, state.viewport)
    }
  }, 500)

  logger.info('LocalBoard initialized')
}

main().catch(err => logger.error('init failed:', err))
