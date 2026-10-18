import type { WhiteboardElement, Viewport } from './types'
import { logger } from './logger'

const DB_NAME = 'localboard'
const STORE_NAME = 'boards'
const KEY = 'default'

interface BoardData {
  elements: WhiteboardElement[]
  viewport: Viewport
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveToStorage(elements: WhiteboardElement[], viewport: Viewport): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ elements, viewport }, KEY)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    logger.debug('auto-saved')
  } catch (err) {
    logger.error('save failed:', err)
  }
}

export async function loadFromStorage(): Promise<BoardData | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(KEY)
    const result = await new Promise<BoardData | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return result ?? null
  } catch (err) {
    logger.error('load failed:', err)
    return null
  }
}
