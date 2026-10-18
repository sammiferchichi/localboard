import type { ToolType, ToolHandlers, Point, Viewport, WhiteboardElement } from './types'
import { StateManager } from './state'
import { createElement, hitTestElement, normalizeElement } from './elements'

let currentDraft: WhiteboardElement | null = null
let isDown = false
let startWorld: Point = { x: 0, y: 0 }
let startScreen: Point = { x: 0, y: 0 }
let moving: { el: WhiteboardElement; ox: number; oy: number; ops?: Point[] }[] | null = null
let panStart: Viewport | null = null

export function getDraft(): WhiteboardElement | null { return currentDraft }
export function clearDraft(): void { currentDraft = null }

function done(): void {
  isDown = false; currentDraft = null; moving = null; panStart = null
}

export function createToolHandlers(type: ToolType, state: StateManager): ToolHandlers {
  if (type === 'select') {
    return {
      onPointerDown(e, _sp, wp) {
        isDown = true
        const els = state.elements
        let hit: WhiteboardElement | null = null
        for (let i = els.length - 1; i >= 0; i--) {
          if (hitTestElement(els[i], wp.x, wp.y)) { hit = els[i]; break }
        }
        if (hit) {
          if (!state.selectedIds.has(hit.id)) state.select(hit.id, e.shiftKey)
          moving = []
          for (const el of state.elements) {
            if (state.selectedIds.has(el.id)) {
              moving.push({ el, ox: el.x, oy: el.y, ops: el.points?.map(p => ({ ...p })) })
            }
          }
          startWorld = { x: wp.x, y: wp.y }
        } else {
          state.select(null)
        }
      },
      onPointerMove(_e, _sp, wp) {
        if (!isDown || !moving) return
        const dx = wp.x - startWorld.x, dy = wp.y - startWorld.y
        for (const m of moving) {
          m.el.x = m.ox + dx; m.el.y = m.oy + dy
          if (m.ops && m.el.points) {
            m.el.points = m.ops.map(p => ({ x: p.x + dx, y: p.y + dy }))
          }
        }
        state.updateElements(state.elements)
      },
      onPointerUp() {
        if (moving && moving.length) state.commitHistory()
        done()
      },
    }
  }

  if (type === 'pan') {
    return {
      onPointerDown(_e, sp) { isDown = true; panStart = { ...state.viewport }; startScreen = { x: sp.x, y: sp.y } },
      onPointerMove(_e, sp) {
        if (!isDown || !panStart) return
        state.setViewport({ x: panStart.x + sp.x - startScreen.x, y: panStart.y + sp.y - startScreen.y })
      },
      onPointerUp() { done() },
    }
  }

  if (type === 'freehand') {
    return {
      onPointerDown(_e, _sp, wp) {
        isDown = true
        const el = createElement('freehand', wp.x, wp.y, state.state.strokeColor, state.state.fillColor, state.state.strokeWidth)
        el.points = [{ x: wp.x, y: wp.y }]
        currentDraft = el
      },
      onPointerMove(_e, _sp, wp) {
        if (!isDown || !currentDraft) return
        currentDraft.points!.push({ x: wp.x, y: wp.y })
        const xs = currentDraft.points!.map(p => p.x), ys = currentDraft.points!.map(p => p.y)
        currentDraft.x = Math.min(...xs); currentDraft.y = Math.min(...ys)
        currentDraft.width = Math.max(...xs) - currentDraft.x
        currentDraft.height = Math.max(...ys) - currentDraft.y
      },
      onPointerUp() {
        if (currentDraft && currentDraft.points && currentDraft.points.length > 1) {
          normalizeElement(currentDraft)
          state.elements.push(currentDraft)
          state.updateElements(state.elements)
          state.commitHistory()
        }
        done()
      },
    }
  }

  if (type === 'rectangle' || type === 'ellipse' || type === 'line') {
    return {
      onPointerDown(_e, _sp, wp) {
        isDown = true
        startWorld = { x: wp.x, y: wp.y }
        currentDraft = createElement(type, wp.x, wp.y, state.state.strokeColor, state.state.fillColor, state.state.strokeWidth)
      },
      onPointerMove(_e, _sp, wp) {
        if (!isDown || !currentDraft) return
        currentDraft.width = wp.x - startWorld.x
        currentDraft.height = wp.y - startWorld.y
        if (type === 'line') {
          currentDraft.points = [{ x: startWorld.x, y: startWorld.y }, { x: wp.x, y: wp.y }]
        }
      },
      onPointerUp() {
        if (currentDraft) {
          if (type === 'line' && currentDraft.points && currentDraft.points.length >= 2) {
            const p0 = currentDraft.points[0], p1 = currentDraft.points[1]
            currentDraft.x = Math.min(p0.x, p1.x); currentDraft.y = Math.min(p0.y, p1.y)
            currentDraft.width = Math.abs(p1.x - p0.x); currentDraft.height = Math.abs(p1.y - p0.y)
          } else {
            normalizeElement(currentDraft)
          }
          const valid = type === 'line' || (Math.abs(currentDraft.width) > 2 && Math.abs(currentDraft.height) > 2)
          if (valid) {
            state.elements.push(currentDraft)
            state.updateElements(state.elements)
            state.commitHistory()
          }
        }
        done()
      },
    }
  }

  return { onPointerDown() {}, onPointerMove() {}, onPointerUp() {} }
}
