class TabFocusService {
  constructor(domainExtractor, config = null) {
    this.domainExtractor = domainExtractor;
    this.config = config;
  }

  setConfig(config) {
    this.config = config;
  }

  /**
   * Extract a comparable identifier from a URL.
   * For normal web URLs, returns hostname + pathname + query (e.g., youtube.com/watch?v=abc).
   * Handles www. prefix differences.
   *
   * @param {string} url
   * @returns {string|null}
   */
  extractTabIdentifier(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;

      if (hostname) {
        const pathname = parsed.pathname || '/';
        const search = parsed.search || '';
        return hostname + pathname + search;
      }
    } catch (error) {
      // Not a valid URL, fall through to special URL handling
    }

    // For special URLs (chrome://, file://, etc.), compare the full normalized URL
    return url.toLowerCase().trim();
  }

  /**
   * Check if two hostnames match (handles www. prefix differences)
   */
  hostnamesMatch(h1, h2) {
    const hostname1 = h1.toLowerCase();
    const hostname2 = h2.toLowerCase();
    
    if (hostname1 === hostname2) return true;
    if (hostname1.startsWith('www.') && hostname1.slice(4) === hostname2) return true;
    if (hostname2.startsWith('www.') && hostname2.slice(4) === hostname1) return true;
    
    return false;
  }

  /**
   * Check if a tab with matching hostname exists in the same window
   * and focus it instead of creating a duplicate
   *
   * @param {Object} newTab - The newly created tab object
   * @returns {Object|null} - { focusedTabId, closedTabId } if duplicate found, null otherwise
   */
  async focusExistingTabIfDuplicate(newTab) {
    try {
      if (!newTab.url || !newTab.windowId) {
        return null;
      }

      let newHostname, newPathname, newSearch;
      try {
        newHostname = new URL(newTab.url).hostname;
        newPathname = new URL(newTab.url).pathname;
        newSearch = new URL(newTab.url).search;
      } catch (urlError) {
        return null;
      }

      const allTabs = await chrome.tabs.query({ windowId: newTab.windowId });

      const matchingTab = allTabs.find(tab => {
        if (tab.id === newTab.id) return false;
        if (!tab.url) return false;

        try {
          const existingHostname = new URL(tab.url).hostname;
          const existingPathname = new URL(tab.url).pathname;
          const existingSearch = new URL(tab.url).search;

          if (!this.hostnamesMatch(newHostname, existingHostname)) return false;

          return newPathname === existingPathname && newSearch === existingSearch;
        } catch (e) {
          return false;
        }
      });

      if (matchingTab) {
        await this.focusTabAndCloseDuplicate(matchingTab.id, newTab.id);
        return {
          focusedTabId: matchingTab.id,
          closedTabId: newTab.id
        };
      }

      return null;
    } catch (error) {
      console.error('[TabFocusService] Error checking for duplicate tab:', error);
      return null;
    }
  }

  /**
   * Focus an existing tab and close the duplicate tab
   * 
   * @param {number} existingTabId - ID of the tab to focus
   * @param {number} duplicateTabId - ID of the duplicate tab to close
   */
  async focusTabAndCloseDuplicate(existingTabId, duplicateTabId) {
    try {
      await chrome.tabs.update(existingTabId, { active: true });
      await chrome.tabs.remove(duplicateTabId);
    } catch (error) {
      console.error('[TabFocusService] Failed to focus existing tab:', error);
    }
  }

  /**
   * Check if duplicate tab prevention is enabled
   * 
   * @returns {Promise<boolean>}
   */
  async isEnabled() {
    try {
      const storage = await chrome.storage.sync.get('preventDuplicateTabs');
      return storage.preventDuplicateTabs === true;
    } catch (error) {
      console.error('[TabFocusService] Failed to check duplicate prevention setting:', error);
      return false;
    }
  }

  /**
   * Enable or disable duplicate tab prevention
   * 
   * @param {boolean} enabled
   */
  async setEnabled(enabled) {
    try {
      await chrome.storage.sync.set({ preventDuplicateTabs: enabled });
    } catch (error) {
      console.error('[TabFocusService] Failed to update duplicate prevention setting:', error);
    }
  }

  /**
   * Check if a tab URL matches any defined category
   * 
   * @param {string} url - The tab URL
   * @returns {boolean} - True if the URL is unlisted (no matching category)
   */
  isUnlistedTab(url) {
    if (!url || !this.config) return false;
    
    const hostname = this.domainExtractor.extract(url);
    if (!hostname) return true;
    
    const category = this.config.findCategory(hostname);
    return category === this.config.fallbackCategory;
  }

  /**
   * Find all duplicate tabs in a window and return them grouped by URL
   * 
   * @param {number|null} windowId - Window ID to check, null for current window
   * @param {boolean} unlistedOnly - If true, only consider tabs that don't match any category
   * @returns {Promise<Array<{url: string, tabs: Array, duplicateCount: number}>>}
   */
  async findAllDuplicates(windowId = null, unlistedOnly = false) {
    const queryOptions = windowId ? { windowId } : { currentWindow: true };
    const allTabs = await chrome.tabs.query(queryOptions);

    const urlGroups = new Map();

    for (const tab of allTabs) {
      if (!tab.url || tab.pinned) continue;
      
      if (unlistedOnly && !this.isUnlistedTab(tab.url)) continue;

      const identifier = this.extractTabIdentifier(tab.url);
      if (!identifier) continue;

      if (!urlGroups.has(identifier)) {
        urlGroups.set(identifier, []);
      }
      urlGroups.get(identifier).push(tab);
    }

    const duplicates = [];
    for (const [url, tabs] of urlGroups) {
      if (tabs.length > 1) {
        duplicates.push({
          url: tabs[0].url,
          tabs: tabs,
          duplicateCount: tabs.length - 1
        });
      }
    }

    return duplicates;
  }

  /**
   * Clean up existing duplicate tabs in a window
   * Keeps the first (leftmost) tab in each duplicate group and closes others
   * 
   * @param {number|null} windowId - Window ID to clean, null for current window
   * @param {boolean} unlistedOnly - If true, only clean up tabs that don't match any category
   * @returns {Promise<{closedCount: number, groups: Array}>}
   */
  async cleanupExistingDuplicates(windowId = null, unlistedOnly = false) {
    try {
      const duplicates = await this.findAllDuplicates(windowId, unlistedOnly);
      const closedTabs = [];
      const duplicateGroups = [];

      for (const group of duplicates) {
        const tabsToClose = group.tabs.slice(1);
        
        for (const tab of tabsToClose) {
          try {
            await chrome.tabs.remove(tab.id);
            closedTabs.push({
              id: tab.id,
              title: tab.title,
              url: tab.url
            });
          } catch (error) {
            console.error('[TabFocusService] Failed to close duplicate tab:', tab.id, error);
          }
        }

        duplicateGroups.push({
          url: group.url,
          keptTab: {
            id: group.tabs[0].id,
            title: group.tabs[0].title,
            url: group.tabs[0].url
          },
          closedCount: tabsToClose.length
        });
      }

      return {
        closedCount: closedTabs.length,
        groups: duplicateGroups,
        closedTabs: closedTabs
      };
    } catch (error) {
      console.error('[TabFocusService] Failed to cleanup duplicates:', error);
      return { closedCount: 0, groups: [], closedTabs: [], error: error.message };
    }
  }
}
