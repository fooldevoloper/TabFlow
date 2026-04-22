class TabSorterApp {
  constructor() {
    this.config = new CategoryConfiguration();
    this.domainExtractor = new DomainExtractor();
    this.colorGenerator = new ColorGenerator();
    this.stateManager = new StateManager();
    this.tabFocusService = new TabFocusService(this.domainExtractor);
    this.groupManager = new GroupManager(this.config, this.stateManager);
    this.tabGroupService = new TabGroupService(
      this.config,
      this.domainExtractor,
      this.colorGenerator,
      this.stateManager,
      this.groupManager
    );
    this.tabFocusService.setConfig(this.config);
    this.messageHandler = new MessageHandler(
      this.tabGroupService,
      this.stateManager,
      this.groupManager,
      this.tabFocusService
    );
    this.keymap = { shortcuts: {} };
    this.processingTabs = new Map();
    this.pendingTabUpdates = new Map();
    this.debounceTimeout = null;
    this.DEBOUNCE_DELAY_MS = 150;
  }

  debounceTabUpdates(tab) {
    this.pendingTabUpdates.set(tab.id, tab);
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.processPendingTabUpdates();
    }, this.DEBOUNCE_DELAY_MS);
  }

  async processPendingTabUpdates() {
    const pendingTabs = Array.from(this.pendingTabUpdates.values());
    this.pendingTabUpdates.clear();
    
    for (const tab of pendingTabs) {
      this.processTabUpdate(tab).catch(error => {
        console.error('[TabSorter] Error processing tab update:', error);
      });
    }
  }

  async processTabUpdate(tab) {
    if (this.processingTabs.has(tab.id)) {
      const existingPromise = this.processingTabs.get(tab.id);
      if (existingPromise) {
        await existingPromise.catch(() => {});
        return;
      }
    }

    const processingPromise = (async () => {
      try {
        const duplicatePreventionEnabled = await this.tabFocusService.isEnabled();
        if (duplicatePreventionEnabled) {
          const result = await this.tabFocusService.focusExistingTabIfDuplicate(tab);
          if (result) {
            return;
          }
        }
        await this.tabGroupService.handleTabUpdate(tab);
      } catch (error) {
        console.error('[TabSorter] Error processing tab:', error);
      }
    })();

    this.processingTabs.set(tab.id, processingPromise);
    try {
      await processingPromise;
    } finally {
      this.processingTabs.delete(tab.id);
    }
  }

  async initialize() {
    await StorageManager.migrateLocalToSync();
    await this.config.loadFromStorage();
    await this.loadKeymap();
    this.setupMessageListeners();
    this.setupTabCreatedListener();
    this.setupTabUpdateListener();
    this.setupTabActivationListener();
    this.setupInstallListener();
    this.setupCommandListeners();
    await this.cleanupDuplicatesOnStartup();

    await this.applyUiMode();
  }

  async applyUiMode() {
    const mode = await this.stateManager.getUiMode();
    if (mode === StateManager.UI_MODES.SIDE_PANEL) {
      if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      }
      if (chrome.action.setPopup) {
        await chrome.action.setPopup({ popup: '' });
      }
    } else {
      if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      }
      if (chrome.action.setPopup) {
        await chrome.action.setPopup({ popup: 'popup.html' });
      }
    }
  }

  async cleanupDuplicatesOnStartup() {
    try {
      const duplicatePreventionEnabled = await this.tabFocusService.isEnabled();
      const groupUnlisted = await this.stateManager.getGroupUnlisted();
      if (duplicatePreventionEnabled && groupUnlisted) {
        const result = await this.tabFocusService.cleanupExistingDuplicates(null, true);
        if (result.closedCount > 0) {
          console.debug(`[TabSorter] Cleaned up ${result.closedCount} duplicate tabs on startup`);
        }
      }
    } catch (error) {
      console.error('[TabSorter] Failed to cleanup duplicates on startup:', error);
    }
  }

  async loadKeymap() {
    try {
      const url = chrome.runtime.getURL('keymap.json');
      const response = await fetch(url);
      this.keymap = await response.json();
    } catch (error) {
      console.error('[TabSorter] Failed to load keymap:', error);
    }
  }

  isShortcutEnabled(command) {
    const shortcut = this.keymap.shortcuts?.[command];
    return shortcut?.enabled !== false;
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        try {
          const windowId = sender.tab?.windowId || null;
          const result = await this.messageHandler.handle(message, { windowId });
          sendResponse(result);
        } catch (e) {
          sendResponse({ success: false, message: e.message });
        }
      })();

      return true;
    });
  }

  setupTabCreatedListener() {
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (!tab.url) return;

      const enabled = await this.stateManager.isEnabled();
      if (!enabled) return;

      if (this.processingTabs.has(tab.id)) {
        const existingPromise = this.processingTabs.get(tab.id);
        if (existingPromise) {
          await existingPromise.catch(() => {});
          return;
        }
      }

      const processingPromise = (async () => {
        try {
          const duplicatePreventionEnabled = await this.tabFocusService.isEnabled();
          if (duplicatePreventionEnabled) {
            const result = await this.tabFocusService.focusExistingTabIfDuplicate(tab);
            if (result) {
              return;
            }
          }
          await this.tabGroupService.handleTabUpdate(tab);
        } catch (error) {
          console.error('[TabSorter] Error processing created tab:', error);
        }
      })();

      this.processingTabs.set(tab.id, processingPromise);
      try {
        await processingPromise;
      } finally {
        this.processingTabs.delete(tab.id);
      }
    });
  }

  setupTabUpdateListener() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'loading') return;
      if (!tab.url) return;

      this.stateManager.isEnabled().then(enabled => {
        if (!enabled) return;
        this.debounceTabUpdates(tab);
      });
    });
  }

  setupTabActivationListener() {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const enabled = await this.stateManager.isEnabled();
      if (!enabled) return;

      await this.tabGroupService.handleTabActivation(activeInfo);
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        await this.tabGroupService.groupTabsByCategory();
        await this.stateManager.setEnabled(true);
      }
    });
  }

  setupCommandListeners() {
    chrome.commands.onCommand.addListener(async (command) => {
      // Get the active window for keyboard shortcuts
      const window = await chrome.windows.getCurrent();
      const windowId = window.id;

      if (!this.isShortcutEnabled(command)) return;

      const match = command.match(/^switch-to-group-(\d+)$/);
      if (match) {
        const groupIndex = parseInt(match[1]);
        await this.tabGroupService.switchToGroup(groupIndex, windowId);
        return;
      }

      if (command === 'focus-right' || command === 'focus-left') {
        const direction = command === 'focus-right' ? 1 : -1;
        await this.tabGroupService.switchToAdjacentGroup(direction, windowId);
      }

      if (command === 'toggle-current-group') {
        await this.tabGroupService.toggleCurrentGroup(windowId);
      }

      if (command === 'toggle-all-groups') {
        await this.tabGroupService.toggleAllGroups(windowId);
      }
    });
  }
}

const app = new TabSorterApp();
app.initialize();
