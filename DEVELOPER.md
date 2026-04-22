# TabFlow Developer Documentation

---

## 🚀 Quick Start

TabFlow has **ZERO build steps, no dependencies, no transpilation**. You can start working on it in 60 seconds:

1. Clone the repo
2. Open `chrome://extensions`
3. Enable Developer Mode (top right toggle)
4. Click **Load unpacked**
5. Select this project folder

That's it. No `npm install`, no build, no bundlers. Edit files, reload the extension on chrome://extensions, and test your changes.

---

## 🧠 Project Philosophy

This project follows these non-negotiable principles:

1. **Zero dependencies** - No npm packages, no libraries, no frameworks. Ever.
2. **No build process** - You edit exactly what runs in the browser.
3. **Small footprint** - Total extension size <100kb.
4. **Predictable performance** - No memory leaks, no background cpu usage when idle.
5. **SOLID** - Every class has exactly one responsibility.
6. **Testable** - Business logic is completely separated from Chrome APIs.

---

## 📂 Core Files Explained

### Entry Points

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration, permissions, keyboard shortcuts |
| `background.js` | Service worker bootstrap - loads all src/ files in correct order |
| `popup.html` | Popup dashboard UI root |
| `popup.js` | Popup bootstrap, initializes all UI modules |

---

### Background Layer (`src/`)

This runs in the service worker. It exists even when the popup is closed.

#### `/src/app.js`
**Composition Root** - This is the only place where objects are instantiated. All dependencies are injected here. No business logic, just wiring.

#### `/src/config/CategoryConfiguration.js`
Single source of truth for domain -> group mappings. Loads from storage, merges with defaults, provides lookup methods.

#### `/src/utils/DomainExtractor.js`
URL parsing logic. Normalizes URLs, extracts root domains, handles subdomains, ignores chrome:// urls.

#### `/src/utils/ColorGenerator.js`
Deterministic color assignment. Same domain always gets the same color. No randomness.

#### `/src/services/TabGroupService.*`
Core grouping logic. Split into 5 modules:
- `.core.js` - Constructor, state, deduplication, retry logic
- `.helpers.js` - Pure helper functions with no side effects
- `.operations.js` - Actual tab grouping / ungrouping operations
- `.navigation.js` - Group focus, expand/collapse logic
- `.queries.js` - Read-only lookup methods

#### `/src/services/StateManager.js`
Abstraction layer over `chrome.storage.local`. All storage goes through this class.

#### `/src/services/GroupManager.js`
CRUD operations for custom groups. Validates input, handles conflicts.

#### `/src/handlers/MessageHandler.js`
Popup <-> Background communication router. All messages pass through here.

---

### Popup Layer (`popup/`)

This runs only when the popup is open. It is destroyed when the popup closes.

#### `popup/state.js`
Global popup state. Contains DOM references, current selection, search query.

#### `popup/constants.js`
Hardcoded constants, color maps, config values.

#### `popup/utils.js`
Shared utility functions used across popup modules.

#### `popup/renderers/`
Pure render functions. Take data, return HTML strings or update DOM. No side effects.

#### `popup/navigation/`
Complete keyboard navigation system. Works for all views automatically.

#### `popup/events/`
All event handlers are here. One file per logical area.

---

## 🔌 Event Flow

This is exactly what happens when you open a new tab:

1. Chrome fires `chrome.tabs.onCreated`
2. Background service worker wakes up
3. `TabSorterApp` is initialized (if not already running)
4. Tab ID is checked against in-flight set (prevents duplicate processing)
5. URL is extracted and normalized by `DomainExtractor`
6. `CategoryConfiguration` finds matching group
7. `TabGroupService` checks if group already exists
8. Tab is added to existing group or new group is created
9. Tab processing completes, ID is removed from in-flight set

---

## ✅ Development Checklist

Before submitting changes make sure:

1. ❌ No `console.log` calls left in code
2. ❌ No new dependencies added
3. ❌ No build steps introduced
4. ✅ All async operations have proper error handling
5. ✅ All methods are <50 lines
6. ✅ You tested the extension actually loads
7. ✅ Auto-sort still works
8. ✅ Keyboard navigation still works

---

## 🐛 Debugging Tips

### Debugging Background Service Worker
1. Go to `chrome://extensions/`
2. Click **Service Worker** link on TabFlow card
3. DevTools opens for the background context

### Debugging Popup
1. Right click the extension icon
2. Click **Inspect Popup**

### Common Issues
- Service workers terminate after 30 seconds of inactivity. Never use `setInterval` in background.
- `chrome.storage.local` is asynchronous. Always await all storage operations.
- Popup context is completely destroyed when closed. Never rely on popup state being preserved.

---

## 📝 Adding New Features

### Step by Step Guide:

**1. If you need a new message from popup to background:**
- Add case in `MessageHandler.handle()` in src/handlers/MessageHandler.js
- Implement handler method
- Call from popup with `sendMessage('actionName', payload)`

**2. If you need new UI:**
- Create renderer in `popup/renderers/`
- Add script tag in popup.html
- Call renderer from event or loader

**3. If you need new business logic:**
- Add method to appropriate service class
- Inject dependency in app.js if needed
- Call from message handler

---

## 🔍 Code Style Rules

1. PascalCase for classes, camelCase for everything else
2. No semicolons (the project follows StandardJS style)
3. No comments unless explaining non-obvious behavior
4. No magic numbers - use constants
5. Keep functions small and focused
6. Use async/await, never raw promises
7. All error paths are handled

---

## ✅ Testing

There are currently no automated tests. All testing is manual:

1. Load extension
2. Open 10+ tabs from different domains
3. Verify they group correctly
4. Test keyboard navigation works
5. Test create/edit/delete groups
6. Test auto-sort toggle
7. Restart browser and verify groups persist

---

## 🚀 Release Process

When ready for release:
1. Update version number in manifest.json
2. Zip entire directory (excluding .git, node_modules)
3. Upload to Chrome Web Store

---

## 🤝 Gotchas

> **Important**: Service workers are stateless. They can be terminated and restarted at any time by Chrome. **Never store state in global variables in the background**. Always persist everything you need to keep through StateManager.

> **Important**: `chrome.tabGroups` API is very finicky. It will throw errors for no reason randomly. Always wrap all calls to chrome.tabGroups in try/catch with retries.

> **Important**: When the popup sends a message and the service worker is not running, Chrome will automatically start it. You don't need to handle this case.
