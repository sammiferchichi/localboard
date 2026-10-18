# LocalBoard

A lightweight, zero-dependency personal whiteboard web app. Draw, annotate, and organize your ideas directly in your browser — no accounts, no servers, no tracking.

Built with **TypeScript + Vite** and the native **Canvas 2D API**. All data stays in your browser via **IndexedDB**.

---

## Features

| Category | Details |
|----------|---------|
| **Drawing Tools** | Rectangle, Ellipse, Line, Freehand (pen), Text |
| **Selection** | Click to select, Shift+click for multi-select, drag to move |
| **Navigation** | Pan (drag with Pan tool) & Zoom (scroll wheel, 0.1x – 5x) |
| **History** | Undo / Redo (Ctrl+Z / Ctrl+Shift+Z), up to 100 states |
| **Editing** | Stroke color, fill color, stroke width, opacity, font size |
| **Persistence** | Auto-save to IndexedDB every 500 ms — your board survives page reloads |
| **Canvas** | HiDPI/Retina support, responsive resize via ResizeObserver |
| **UX** | Status bar, right-click context menu, keyboard shortcuts, async logger |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18 (recommended: latest LTS)
- **npm** (comes with Node.js)

### Run locally

```bash
# 1. Clone the repository
git clone https://github.com/sammiferchichi/localboard.git
cd localboard

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
# Full build (type-check + bundle)
npm run build

# Standalone build (single HTML file with inlined JS)
npm run build:standalone

# Preview production build
npm run preview
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6.0 |
| Bundler | Vite 8.0 |
| Rendering | Canvas 2D API (native) |
| Persistence | IndexedDB (native) |
| UI | Vanilla DOM (no framework) |
| Runtime deps | **Zero** |

**Bundle size:** ~13.7 kB JS (4.8 kB gzipped)

---

## Project Structure

```
whiteBord/
├── index.html              # App shell (toolbar + canvas + inline CSS)
├── package.json            # Scripts & dev dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── scripts/
│   └── inline.cjs          # Post-build: inlines JS into single HTML
├── src/
│   ├── main.ts             # Entry point — event wiring, pan/zoom, auto-save
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── elements.ts         # Element factory, hit-testing, manipulation
│   ├── state.ts            # Global state + undo/redo stacks (max 100)
│   ├── storage.ts          # IndexedDB auto-save / load
│   ├── renderer.ts         # Canvas 2D draw loop per element type
│   ├── tools.ts            # Tool handlers (select, draw, shape, pan)
│   ├── ui.ts               # Toolbar, text editor, color controls, status bar
│   └── logger.ts           # Async non-blocking logger (4 levels)
└── PROJECT_MAP.md          # Architecture & data model documentation
```

---

## Data Flow

```
Pointer Events → Tool Handler → State Mutation → Canvas Render
                    ↕                       ↕
              Undo/Redo Stack        IndexedDB (every 500 ms)
```

### Data Model

```typescript
WhiteboardElement {
  id: string
  type: 'rectangle' | 'ellipse' | 'line' | 'freehand' | 'text'
  x, y, width, height: number
  rotation: number
  strokeColor, fillColor: string
  strokeWidth, opacity, fontSize?: number
  points?: Point[]       // freehand & line
  text?: string          // text elements
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete selected elements |
| `Escape` | Deselect all / close context menu |
| `Shift + Click` | Multi-select |
| `Scroll Wheel` | Zoom in/out (toward cursor) |

---

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 15+ |
| Edge | 90+ |

Requires support for: Canvas 2D, IndexedDB, ResizeObserver, Pointer Events.

---

## Configuration

### Log Level

By default, the logger runs at `info` level. To change it, edit the first line of `src/main.ts`:

```typescript
setLogLevel('debug') // 'debug' | 'info' | 'warn' | 'error'
```

### Auto-save Interval

The debounce interval is set to 500 ms in `src/main.ts`:

```typescript
setInterval(() => {
  if (state.needsSave()) {
    saveToStorage(state.elements, state.viewport)
  }
}, 500) // ← change this value
```

### Undo Stack Size

Maximum undo history is 100 states, defined in `src/state.ts`:

```typescript
const MAX_HISTORY = 100 // ← change this value
```

---

## Standalone Build

The `build:standalone` command produces a **single self-contained HTML file** (`dist/index.html`) with all JavaScript inlined. This file can be:

- Opened directly in any browser (double-click)
- Hosted on any static file server
- Shared via email or USB drive
- Embedded in an `<iframe>`

```bash
npm run build:standalone
# Output: dist/index.html (~13.7 kB)
```

---

## Roadmap

Planned features for future releases:

- [ ] Export to PNG / SVG
- [ ] Grid background option
- [ ] Element duplication (Ctrl+D)
- [ ] Multi-select rubber-band
- [ ] Arrowheads on lines
- [ ] Ctrl+A select all
- [ ] Multiple boards / pages
- [ ] Cloud sync

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/sammiferchichi/localboard.git`
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Make** your changes
5. **Commit** with clear messages: `git commit -m "Add: my feature"`
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Open** a Pull Request

### Code Style

- TypeScript strict mode
- No runtime dependencies
- Vanilla DOM (no frameworks)
- Follow existing patterns in the codebase

---

## License

This project is licensed under the **MIT License** — free for personal and commercial use.

```
MIT License

Copyright (c) 2026 LocalBoard Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## Acknowledgements

- Built with [Vite](https://vitejs.dev/) — next generation frontend tooling
- TypeScript — JavaScript with types for scale
- The amazing open-source community

---

## Support

If you find this project useful, consider giving it a star on GitHub.

For bugs and feature requests, please open an issue on the [GitHub Issues](https://github.com/sammiferchichi/localboard/issues) page.

---

**Happy drawing!**
