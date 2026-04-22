class MessageHandler {
  constructor(tabGroupService, stateManager, groupManager, tabFocusService) {
    this.tabGroupService = tabGroupService;
    this.stateManager = stateManager;
    this.groupManager = groupManager;
    this.tabFocusService = tabFocusService;
  }

  async handle(message, context = {}) {
    const { windowId = null } = context;
    
    switch (message.action) {
      case 'groupTabs':
        return await this.handleGroupTabs(windowId);
      case 'ungroupAll':
        return await this.handleUngroupAll(windowId);
      case 'getState':
        return await this.handleGetState();
      case 'getGroups':
        return await this.handleGetGroups();
      case 'addGroup':
        return await this.handleAddGroup(message);
      case 'updateGroup':
        return await this.handleUpdateGroup(message);
      case 'deleteGroup':
        return await this.handleDeleteGroup(message);
      case 'resetGroups':
        return await this.handleResetGroups();
      case 'switchToGroup':
        return await this.handleSwitchToGroup(message);
      case 'getGroupPositions':
        return await this.handleGetGroupPositions(message);
      case 'getActiveTabGroups':
        return await this.handleGetActiveTabGroups(windowId);
      case 'focusGroup':
        return await this.handleFocusGroup(message, windowId);
      case 'focusTab':
        return await this.handleFocusTab(message);
      case 'checkDomainConflicts':
        return await this.handleCheckDomainConflicts(message);
      case 'moveDomainsToGroup':
        return await this.handleMoveDomainsToGroup(message);
      case 'toggleAllGroups':
        return await this.handleToggleAllGroups(windowId);
      case 'getAutoCollapse':
        return await this.handleGetAutoCollapse();
      case 'setAutoCollapse':
        return await this.handleSetAutoCollapse(message);
      case 'getAllTabs':
        return await this.handleGetAllTabs(windowId);
      case 'closeTab':
        return await this.handleCloseTab(message);
      case 'closeGroup':
        return await this.handleCloseGroup(message, windowId);
      case 'moveTabToGroup':
        return await this.handleMoveTabToGroup(message, windowId);
      case 'getDuplicatePrevention':
        return await this.handleGetDuplicatePrevention();
      case 'setDuplicatePrevention':
        return await this.handleSetDuplicatePrevention(message);
      case 'getGroupUnlisted':
        return await this.handleGetGroupUnlisted();
      case 'setGroupUnlisted':
        return await this.handleSetGroupUnlisted(message);
      case 'getDisplayMode':
        return await this.handleGetDisplayMode();
      case 'setDisplayMode':
        return await this.handleSetDisplayMode(message);
      case 'getUiMode':
        return await this.handleGetUiMode();
      case 'setUiMode':
        return await this.handleSetUiMode(message);
      case 'updateGroupTitles':
        return await this.handleUpdateGroupTitles(windowId);
      case 'enterFocusMode':
        return await this.handleEnterFocusMode(message, windowId);
      case 'exitFocusMode':
        return await this.handleExitFocusMode(windowId);
      default:
        return { success: false, message: 'Unknown action' };
    }
  }

  async handleGetUiMode() {
    const mode = await this.stateManager.getUiMode();
    return { mode };
  }

  async handleSetUiMode(message) {
    await this.stateManager.setUiMode(message.mode);
    // Apply changes immediately (TabSorterApp is a global instance in background.js context)
    if (typeof app !== 'undefined' && app.applyUiMode) {
      await app.applyUiMode();
    }
    return { success: true };
  }

  async handleGroupTabs(windowId = null) {
    const result = await this.tabGroupService.groupTabsByCategory(windowId);
    if (result.success) {
      await this.stateManager.setEnabled(true);
    }
    return result;
  }

  async handleUngroupAll(windowId = null) {
    const result = await this.tabGroupService.ungroupAllTabs(windowId);
    if (result.success) {
      await this.stateManager.setEnabled(false);
    }
    return result;
  }

  async handleGetState() {
    const enabled = await this.stateManager.isEnabled();
    return { enabled };
  }

  async handleGetGroups() {
    const groups = await this.groupManager.getGroups();
    return { success: true, groups };
  }

  async handleAddGroup(message) {
    try {
      const group = await this.groupManager.addGroup(message.name, message.domains, message.emoji);
      return { success: true, group };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleUpdateGroup(message) {
    try {
      const group = await this.groupManager.updateGroup(message.id, message.name, message.domains, message.emoji);
      return { success: true, group };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleDeleteGroup(message) {
    try {
      await this.groupManager.deleteGroup(message.id);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleResetGroups() {
    try {
      const groups = await this.groupManager.resetToDefaults();
      return { success: true, groups };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleSwitchToGroup(message) {
    try {
      const result = await this.tabGroupService.switchToGroup(message.groupIndex);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleGetGroupPositions(message) {
    try {
      const groups = await this.tabGroupService.getGroupsByPosition();
      return { success: true, groups };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleGetActiveTabGroups(windowId = null) {
    try {
      const result = await this.tabGroupService.getActiveTabGroups(windowId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleFocusGroup(message, windowId = null) {
    try {
      await this.tabGroupService.focusGroup(message.groupId, windowId);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleFocusTab(message) {
    try {
      await this.tabGroupService.focusTab(message.tabId);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleCheckDomainConflicts(message) {
    try {
      const result = await this.groupManager.findDomainConflicts(
        message.domains,
        message.excludeGroupId
      );
      return { success: true, duplicates: result.duplicates, conflicts: result.conflicts, clean: result.clean };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleMoveDomainsToGroup(message) {
    try {
      const group = await this.groupManager.moveDomainsToGroup(
        message.groupName,
        message.domains
      );
      return { success: true, group };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleToggleAllGroups(windowId = null) {
    try {
      const result = await this.tabGroupService.toggleAllGroups(windowId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleGetAutoCollapse() {
    const autoCollapse = await this.stateManager.getAutoCollapse();
    return { autoCollapse };
  }

  async handleSetAutoCollapse(message) {
    await this.stateManager.setAutoCollapse(message.enabled);
    return { success: true };
  }

  async handleGetAllTabs(windowId = null) {
    try {
      const queryOptions = windowId ? { windowId } : { currentWindow: true };
      const tabs = await chrome.tabs.query(queryOptions);
      const activeTabs = tabs.filter(tab => tab.id !== chrome.tabs.TAB_ID_NONE);
      const formattedTabs = activeTabs.map(tab => ({
        id: tab.id,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl || '',
        active: tab.active
      }));
      return { success: true, tabs: formattedTabs };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleCloseTab(message) {
    try {
      await chrome.tabs.remove(message.tabId);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleCloseTabsByDomain(message, windowId = null) {
    try {
      const queryOptions = windowId ? { windowId } : { currentWindow: true };
      const tabs = await chrome.tabs.query(queryOptions);
      const tabsToRemove = tabs.filter(tab => {
        const domain = this.tabGroupService.domainExtractor.extract(tab.url);
        return domain === message.domain || (!domain && message.domain === 'Other');
      });
      
      if (tabsToRemove.length > 0) {
        await chrome.tabs.remove(tabsToRemove.map(t => t.id));
      }
      return { success: true, closedCount: tabsToRemove.length };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleCloseGroup(message, windowId = null) {
    try {
      const groups = await this.tabGroupService.getActiveTabGroups(windowId);
      const group = groups.groups.find(g => g.id === message.groupId);
      if (group && group.tabs.length > 0) {
        const tabIds = group.tabs.map(t => t.id);
        await chrome.tabs.remove(tabIds);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleMoveTabToGroup(message, windowId = null) {
    try {
      const groups = await this.tabGroupService.getActiveTabGroups(windowId);
      const sourceGroup = groups.groups.find(g => {
        return g.tabs.some(t => t.id === message.tabId);
      });
      const targetGroup = groups.groups.find(g => g.id === message.targetGroupId);
      if (!targetGroup) return { success: false, message: 'Target group not found' };

      const tab = await chrome.tabs.get(message.tabId);
      const domain = this.tabGroupService.domainExtractor.extract(tab.url);

      if (domain) {
        const sourceGroupName = sourceGroup ? sourceGroup.title.replace(/\s*\(\d+\)$/, '') : null;
        const targetGroupName = targetGroup.title.replace(/\s*\(\d+\)$/, '');
        await this.groupManager.moveDomainsToGroup(targetGroupName, [domain]);
      }

      const nativeGroupId = targetGroup.id;
      await chrome.tabs.group({ groupId: nativeGroupId, tabIds: message.tabId });

      const knownCategories = this.tabGroupService.config.getAllCategories();
      const updatedGroups = await this.tabGroupService.getActiveTabGroups();
      if (sourceGroup && sourceGroup.id !== targetGroup.id) {
        const updatedSource = updatedGroups.groups.find(g => g.id === sourceGroup.id);
        if (updatedSource) {
          const sourceCategory = TitleParser.extractCategoryName(updatedSource.title, knownCategories) 
            || updatedSource.title.replace(/\s*\(\d+\)$/, '').replace(/^(?:\S+\s+)?/, '');
          await chrome.tabGroups.update(sourceGroup.id, {
            title: await this.tabGroupService.formatTitle(sourceCategory, updatedSource.tabs.length)
          });
        }
      }
      const updatedTarget = updatedGroups.groups.find(g => g.id === targetGroup.id);
      if (updatedTarget) {
        const targetCategory = TitleParser.extractCategoryName(updatedTarget.title, knownCategories)
          || updatedTarget.title.replace(/\s*\(\d+\)$/, '').replace(/^(?:\S+\s+)?/, '');
        await chrome.tabGroups.update(targetGroup.id, {
          title: await this.tabGroupService.formatTitle(targetCategory, updatedTarget.tabs.length)
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleGetDuplicatePrevention() {
    const enabled = await this.tabFocusService.isEnabled();
    return { enabled };
  }

  async handleSetDuplicatePrevention(message) {
    const groupUnlisted = await this.stateManager.getGroupUnlisted();
    await this.tabFocusService.setEnabled(message.enabled);
    
    if (message.enabled && groupUnlisted) {
      const cleanupResult = await this.tabFocusService.cleanupExistingDuplicates(null, true);
      return { 
        success: true, 
        cleanupPerformed: true,
        closedCount: cleanupResult.closedCount,
        cleanedGroups: cleanupResult.groups
      };
    }
    
    return { success: true };
  }

  async handleGetGroupUnlisted() {
    const enabled = await this.stateManager.getGroupUnlisted();
    return { enabled };
  }

  async handleSetGroupUnlisted(message) {
    await this.stateManager.setGroupUnlisted(message.enabled);
    
    if (message.enabled) {
      const duplicatePreventionEnabled = await this.tabFocusService.isEnabled();
      if (duplicatePreventionEnabled) {
        const cleanupResult = await this.tabFocusService.cleanupExistingDuplicates(null, true);
        return { 
          success: true,
          cleanupPerformed: true,
          closedCount: cleanupResult.closedCount
        };
      }
    }
    
    return { success: true };
  }

  async handleGetDisplayMode() {
    const mode = await this.stateManager.getDisplayMode();
    return { mode };
  }

  async handleSetDisplayMode(message) {
    await this.stateManager.setDisplayMode(message.mode);
    return { success: true };
  }

  async handleUpdateGroupTitles(windowId = null) {
    try {
      const result = await this.tabGroupService.updateGroupTitles(windowId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleEnterFocusMode(message, windowId = null) {
    try {
      const result = await this.tabGroupService.enterFocusMode(message.groupId, windowId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleExitFocusMode(windowId = null) {
    try {
      const result = await this.tabGroupService.exitFocusMode(windowId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
