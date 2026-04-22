class StateManager {
  static STORAGE_KEYS = {
    ENABLED: 'enabled',
    GROUPS: 'groups',
    AUTO_COLLAPSE: 'autoCollapse',
    DISPLAY_MODE: 'displayMode',
    GROUP_UNLISTED: 'groupUnlisted',
    UI_MODE: 'uiMode'
  };

  static UI_MODES = {
    SIDE_PANEL: 'sidepanel',
    POPUP: 'popup'
  };

  async getUiMode() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.UI_MODE);
    return storage.uiMode || StateManager.UI_MODES.POPUP;
  }

  async setUiMode(mode) {
    if (!Object.values(StateManager.UI_MODES).includes(mode)) {
      throw new Error(`Invalid UI mode: ${mode}`);
    }
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.UI_MODE]: mode });
  }

  static DISPLAY_MODES = {
    ICON_NAME_COUNT: 'icon+name+count',
    ICON_NAME: 'icon+name',
    ICON_COUNT: 'icon+count',
    ICON_ONLY: 'icon-only',
    NAME_COUNT: 'name+count',
    NAME_ONLY: 'name-only',
    COUNT_ONLY: 'count-only',
    COUNT: 'count'
  };

  async isEnabled() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.ENABLED);
    return storage.enabled ?? false;
  }

  async setEnabled(enabled) {
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.ENABLED]: enabled });
  }

  async getGroups() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.GROUPS);
    return storage.groups || [];
  }

  async setGroups(groups) {
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.GROUPS]: groups });
  }

  async getAutoCollapse() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.AUTO_COLLAPSE);
    return storage.autoCollapse ?? false;
  }

  async setAutoCollapse(enabled) {
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.AUTO_COLLAPSE]: enabled });
  }

  async getDisplayMode() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.DISPLAY_MODE);
    const storedMode = storage.displayMode;
    
    if (storedMode && Object.values(StateManager.DISPLAY_MODES).includes(storedMode)) {
      return storedMode;
    }
    
    return StateManager.DISPLAY_MODES.ICON_NAME_COUNT;
  }

  async setDisplayMode(mode) {
    if (!Object.values(StateManager.DISPLAY_MODES).includes(mode)) {
      throw new Error(`Invalid display mode: ${mode}`);
    }
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.DISPLAY_MODE]: mode });
  }

  async getGroupUnlisted() {
    const storage = await chrome.storage.sync.get(StateManager.STORAGE_KEYS.GROUP_UNLISTED);
    return storage.groupUnlisted ?? false;
  }

  async setGroupUnlisted(enabled) {
    await chrome.storage.sync.set({ [StateManager.STORAGE_KEYS.GROUP_UNLISTED]: enabled });
  }
}
