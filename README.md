# TabFlow - Smart Tab Manager

A Chrome extension that automatically organizes your browser tabs into customizable groups based on domain patterns. Toggle auto-sorting on/off, manage your own groups, and keep your workspace clean — all from a sleek dark-mode popup dashboard.

---

## Features

- **Auto-sorting** — New tabs are grouped instantly as you open or navigate them
- **Custom groups** — Create, edit, and delete your own group rules via the popup UI
- **Reset to defaults** — Restore the built-in group set at any time
- **Persistent settings** — All groups and preferences survive browser restarts
- **Zero dependencies** — Plain JavaScript, no build step, no frameworks
- **Keyboard navigation** — Full vim-style navigation (`j`/`k`, `/` search, `Alt+H`/`Alt+L` group switching)

---

## Installation

### Option 1: Load Unpacked (Recommended for Testing & Development)

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/fooldevoloper/TabFlow.git
   cd TabFlow
   ```

2. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Or click **⋮ → More Tools → Extensions**

3. **Enable Developer Mode:**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the extension:**
   - Click **Load unpacked**
   - Select the project root folder (the one containing `manifest.json`)

5. **Pin the extension (optional):**
   - Click the puzzle-piece icon in the toolbar
   - Click the pin next to **TabFlow**

That's it — click the extension icon to open the dashboard and start managing groups.

### Option 2: Chrome Web Store

Not yet available. Watch this repo for release updates.

---

## Usage

### Popup Dashboard

| View | What it does |
|------|-------------|
| **Groups** | View active tab groups, focus groups/tabs, search across all tabs |
| **Settings** | Manage group configurations, sort now, ungroup all, reset to defaults |

### Creating a Group

1. Click the **⚙** icon to open Settings
2. Click **+ New**
3. Enter a name (e.g. `YOUTUBE`, `DOCS`)
4. Enter domains, one per line (e.g. `youtube.com`, `youtu.be`)
5. Click **Save**

Subdomains match automatically — adding `youtube.com` will also catch `www.youtube.com`, `music.youtube.com`, etc.

### Auto-Sort Toggle

The toggle switch in the header controls whether newly opened or navigated tabs are grouped automatically. When off, you can still sort manually from the Settings tab.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `j` / `k` | Navigate up/down through groups and tabs |
| `Enter` | Activate selected item (focus group/tab, open settings) |
| `/` or `i` | Open search |
| `Esc` | Close modal, exit search, or go back |
| `Alt+H` | Focus previous tab group |
| `Alt+L` | Focus next tab group |
| `Alt+E` | Toggle expand/collapse current group |
| `Alt+T` | Open TabFlow popup |

---

## Architecture

The extension follows SOLID principles with a class-based design and modular file structure:

### Background (Service Worker)

```
TabSorterApp (composition root)
├── CategoryConfiguration   — Domain-to-group mappings (singleton, loaded from storage)
├── DomainExtractor         — URL parsing and normalization
├── ColorGenerator          — Deterministic color assignment
├── TabGroupService         — Core grouping/ungrouping logic
│   ├── .core.js            — Constructor, drag detection, retry, group info
│   ├── .helpers.js         — Category map, group lookup, create/update, collapse
│   ├── .operations.js      — Group tabs, renumber, ungroup, handle tab events
│   ├── .navigation.js      — Switch groups, toggle current/all
│   └── .queries.js         — Get groups by position, get active tab groups, focus
├── StateManager            — Chrome Storage persistence
├── GroupManager            — CRUD operations for groups
└── MessageHandler          — Routes popup ↔ background messages
```

### Popup (Dashboard UI)

```
popup/
├── state.js                — DOM references and shared state
├── constants.js            — COLOR_MAP
├── utils.js                — showStatus, sendMessage, parseDomains
├── renderers/
│   ├── active-groups.js    — Render active tab groups view
│   ├── search-results.js   — Render search results view
│   └── config-groups.js    — Render settings group list
├── modals.js               — Open/close modal, conflict modal
├── loaders.js              — loadActiveGroups, loadConfigGroups
├── crud.js                 — handleSave, handleDelete, executeSave
├── search.js               — enterSearch, exitSearch
├── navigation/
│   ├── collection.js       — getNavItems — collect navigable DOM elements
│   ├── selection.js        — selectItem, clearSelection
│   └── activation.js       — activateItem — dispatch click/sendMessage
└── events/
    ├── groups.js           — Group list click handlers
    ├── search.js           — Search results click handlers
    ├── config.js           — Config list click handlers
    ├── panel.js            — Settings panel open/close
    ├── modals.js           — Modal open/close/save/confirm
    ├── buttons.js          — Sort/Ungroup/Reset/Expand buttons
    └── search-input.js     — Search input handlers
```

### Event Listeners

| Listener | Purpose |
|----------|---------|
| `chrome.tabs.onCreated` | Group a tab immediately when opened with a URL |
| `chrome.tabs.onUpdated` | Re-group when a tab navigates to a new URL |
| `chrome.tabs.onActivated` | Expand the active group, collapse others |
| `chrome.runtime.onMessage` | Handle popup actions (CRUD, sort, ungroup) |
| `chrome.runtime.onInstalled` | Auto-group on first install |
| `chrome.commands.onCommand` | Keyboard shortcut handling |

### Concurrency Safeguards

- **Tab processing deduplication** — A `Set` of in-flight tab IDs prevents `onCreated` and `onUpdated` from processing the same tab concurrently
- **Error-safe messaging** — All message handlers are wrapped in try/catch to guarantee `sendResponse` is always called, preventing popup hangs

---

## File Structure

```
sorter/
├── background.js              # Service worker entry point (importScripts loader)
├── popup.html                 # Dashboard UI
├── popup.css                  # Styles (dark-mode design system)
├── popup.js                   # Popup bootstrap (toggle handler, keyboard, init)
├── manifest.json              # Manifest V3 configuration
├── defaults.json              # Built-in domain-to-category mappings
├── keymap.json                # Keyboard shortcut enable/disable config
├── icons/                     # SVG icons at multiple sizes
├── src/
│   ├── app.js                 # TabSorterApp composition root + bootstrap
│   ├── config/
│   │   └── CategoryConfiguration.js
│   ├── utils/
│   │   ├── DomainExtractor.js
│   │   └── ColorGenerator.js
│   ├── services/
│   │   ├── TabGroupService.js
│   │   ├── TabGroupService.core.js
│   │   ├── TabGroupService.helpers.js
│   │   ├── TabGroupService.operations.js
│   │   ├── TabGroupService.navigation.js
│   │   ├── TabGroupService.queries.js
│   │   ├── StateManager.js
│   │   └── GroupManager.js
│   └── handlers/
│       └── MessageHandler.js
└── popup/
    ├── state.js
    ├── constants.js
    ├── utils.js
    ├── modals.js
    ├── loaders.js
    ├── crud.js
    ├── search.js
    ├── renderers/
    │   ├── active-groups.js
    │   ├── search-results.js
    │   └── config-groups.js
    ├── navigation/
    │   ├── collection.js
    │   ├── selection.js
    │   └── activation.js
    └── events/
        ├── groups.js
        ├── search.js
        ├── config.js
        ├── panel.js
        ├── modals.js
        ├── buttons.js
        └── search-input.js
```

---

## 🧑‍💻 Developers

Full developer documentation, architecture explanation, and contribution guide is available in **[DEVELOPER.md](./DEVELOPER.md)**.

---

## Contributing

### Prerequisites

- Chrome (or any Chromium-based browser)
- No build tools or dependencies — just a text editor

### Development Workflow

> ✅ **ZERO setup required**. No npm, no build, no bundlers.

1. Fork and clone this repository
2. Go to `chrome://extensions/`
3. Enable Developer Mode (top right toggle)
4. Click **Load unpacked** and select this project folder
5. Edit files directly
6. Click the reload button on TabFlow card to apply changes

See **[DEVELOPER.md](./DEVELOPER.md)** for full architecture guide, code patterns, and debugging tips.

### Adding a New Message Action

1. Add a case in `MessageHandler.handle()` (`src/handlers/MessageHandler.js`):
   ```javascript
   case 'myNewAction':
     return await this.handleMyNewAction(message);
   ```
2. Implement the handler method in the same file
3. Call it from the popup via `sendMessage('myNewAction', { ... })`

### Adding a New Popup View

1. Create a renderer in `popup/renderers/` (e.g. `my-view.js`)
2. Add the `<script>` tag in `popup.html` after existing renderers
3. Call the renderer from a loader or event handler as needed

### Code Style

- No comments unless they explain non-obvious behavior
- Follow existing naming conventions (PascalCase classes, camelCase methods/variables)
- Keep methods focused — one responsibility each
- Avoid introducing external dependencies or build steps
- New files should be placed in the appropriate concern-based directory

### Pull Requests

1. Create a feature branch (`git checkout -b feat/your-feature`)
2. Commit your changes
3. Push and open a PR with a clear description of what changed and why

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tabs not auto-grouping | Make sure the toggle is on in the popup |
| Groups disappeared after restart | Check `chrome://extensions/` that the extension is enabled; groups persist in `chrome.storage.local` |
| Extension not loading | Verify `manifest.json` is in the folder you selected for **Load unpacked** |
| Changes not showing after editing | Click the **reload** icon on the extension card in `chrome://extensions/` |
| Keyboard shortcuts not working | Check `keymap.json` to ensure shortcuts are enabled |

---

## License

See the repository for license details.
