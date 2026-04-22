TabGroupService.prototype.groupTabsByCategory = async function(windowId = null) {
  if (this.isDragging) {
    return { success: false, message: 'Tabs being rearranged' };
  }

  const queryOptions = windowId ? { windowId } : { currentWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);

  if (!tabs || tabs.length === 0) {
    return { success: false, message: 'No tabs found' };
  }

  await this.cleanupEmptyGroups(windowId);

  const categoryMap = await this.buildCategoryMap(tabs);

  if (categoryMap.size === 0) {
    return { success: false, message: 'No valid URLs to group' };
  }

  const windowIdToUse = windowId || (await chrome.windows.getLastFocused()).id;
  const existingGroups = await chrome.tabGroups.query({ windowId: windowIdToUse });

  const validGroupNames = new Set(
    this.config.categories.keys()
  );
  const knownCategories = this.config.getAllCategories();
  const groupUnlisted = await this.stateManager.getGroupUnlisted();

  for (const group of existingGroups) {
    const groupName = TitleParser.extractCategoryName(group.title, knownCategories);

    // Remove OTHER group if groupUnlisted is disabled, or any group not in validGroupNames
    const shouldRemove = (!groupName || !validGroupNames.has(groupName)) ||
      (!groupUnlisted && groupName === this.config.fallbackCategory);
    
    if (shouldRemove) {
      try {
        const groupTabs = tabs.filter(t => t.groupId === group.id);
        for (const tab of groupTabs) {
          await chrome.tabs.ungroup(tab.id);
        }
        await chrome.tabGroups.remove(group.id);
      } catch (error) {
        console.error('[TabGroupService] Failed to remove unknown group:', group.id, error);
      }
    }
  }

  const existingGroupMap = await this.buildExistingGroupMap(existingGroups);
  const createdGroups = [];

  const activeTab = tabs.find(t => t.active);
  const activeGroupId = activeTab ? activeTab.groupId : null;

  for (const [category, tabIds] of categoryMap) {
    const group = await this.createOrUpdateGroup(
      category,
      tabIds,
      existingGroupMap,
      categoryMap.get(category)?.length || tabIds.length,
      activeGroupId
    );
    if (group) {
      createdGroups.push(group);
    }
  }

  await new Promise(resolve => setTimeout(resolve, Constants.TIMING.GROUP_DELAY_MS));

  await this.renumberGroupsByPosition(windowIdToUse, activeGroupId);

  let finalGroups = [];
  let retries = Constants.TIMING.RETRY_MAX_ATTEMPTS;
  while (retries > 0 && finalGroups.length === 0) {
    await new Promise(resolve => setTimeout(resolve, Constants.TIMING.RETRY_DELAY_MS));
    finalGroups = await chrome.tabGroups.query({ windowId: windowIdToUse });
    retries--;
  }

  if (finalGroups.length > 0) {
  } else {
    finalGroups = createdGroups.map(g => ({
      id: g.groupId,
      title: `${g.category}`,
      color: g.color
    }));
  }

  return {
    success: true,
    groupedCount: categoryMap.size,
    groups: createdGroups
  };
};

TabGroupService.prototype.renumberGroupsByPosition = async function(windowId, activeGroupId = null) {
  const groups = await chrome.tabGroups.query({ windowId });
  const tabs = await chrome.tabs.query({ windowId });
  const autoCollapse = await this.stateManager.getAutoCollapse();

  const groupsWithPosition = groups.map(g => {
    const groupTabs = tabs.filter(t => t.groupId === g.id);
    const leftmostIndex = groupTabs.length > 0
      ? Math.min(...groupTabs.map(t => t.index))
      : Infinity;
    return { ...g, leftmostIndex, tabCount: groupTabs.length };
  });

  groupsWithPosition.sort((a, b) => a.leftmostIndex - b.leftmostIndex);

  const knownCategories = this.config.getAllCategories();

  for (let i = 0; i < groupsWithPosition.length; i++) {
    const g = groupsWithPosition[i];
    const categoryName = TitleParser.extractCategoryName(g.title, knownCategories);

    const nameAndCount = await this.formatTitle(categoryName || 'UNKNOWN', g.tabCount);

    let shouldCollapse = false;
    if (autoCollapse && activeGroupId) {
      shouldCollapse = g.id !== activeGroupId;
    }

    await this.withRetry(() => chrome.tabGroups.update(g.id, {
      title: nameAndCount,
      collapsed: shouldCollapse
    }));
  }
};

TabGroupService.prototype.ungroupAllTabs = async function(windowId = null) {
  if (this.isDragging) {
    return { success: false, message: 'Tabs being rearranged' };
  }

  const queryOptions = windowId ? { windowId } : { currentWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);

  const groupedTabIds = tabs
    .filter(tab => tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
    .map(tab => tab.id);

  if (groupedTabIds.length === 0) {
    return { success: true, message: 'No grouped tabs found', ungroupedCount: 0 };
  }

  for (const tabId of groupedTabIds) {
    try {
      await this.withRetry(() => chrome.tabs.ungroup(tabId));
    } catch (error) {
      console.error('[TabGroupService] Failed to ungroup tab:', tabId, error);
    }
  }

  // Clean up orphaned/empty Chrome tab groups
  await this.cleanupEmptyGroups(windowId);

  return { success: true, ungroupedCount: groupedTabIds.length };
};

TabGroupService.prototype.handleTabUpdate = async function(tab) {
  if (this.isDragging) return;

  // Get all groups for longest prefix matching
  const groups = await this.groupManager.getGroups();
  const matchResult = await this.findBestMatchingGroup(tab.url, groups);
  
  if (!matchResult || !matchResult.groupName) return;

  const { groupName } = matchResult;
  const allTabs = await chrome.tabs.query({ windowId: tab.windowId });

  // Find all tabs that match the SAME group using longest prefix matching
  const matchingTabs = [];
  for (const t of allTabs) {
    if (!t.url) continue;
    const tabMatch = await this.findBestMatchingGroup(t.url, groups);
    if (tabMatch && tabMatch.groupName === groupName) {
      matchingTabs.push(t);
    }
  }

  if (matchingTabs.length === 0) return;

  const existingGroups = await chrome.tabGroups.query({ windowId: tab.windowId });
  
  // Try to find existing Chrome tab group by name
  let groupId = this.findGroupByCategory(existingGroups, groupName);
  
  // Ensure groupId is an integer if it exists
  if (groupId !== undefined && groupId !== null) {
    groupId = parseInt(groupId, 10);
  }

  const activeTab = allTabs.find(t => t.active);
  const activeGroupId = activeTab ? activeTab.groupId : null;

  const title = await this.formatTitle(groupName, matchingTabs.length);

  if (!groupId) {
    groupId = await this.withRetry(() => chrome.tabs.group({ tabIds: matchingTabs.map(t => t.id) }));
    await this.withRetry(() => chrome.tabGroups.update(groupId, {
      title: title,
      color: this.colorGenerator.generate(groupName),
      collapsed: false
    }));
  } else {
    const tabsToAdd = matchingTabs
      .filter(t => t.groupId !== groupId)
      .map(t => t.id);

    if (tabsToAdd.length > 0) {
      await this.withRetry(() => chrome.tabs.group({ groupId, tabIds: tabsToAdd }));
    }

    await this.withRetry(() => chrome.tabGroups.update(groupId, {
      title: title,
      color: this.colorGenerator.generate(groupName),
      collapsed: false
    }));
  }

  await this.renumberGroupsByPosition(tab.windowId, activeGroupId);

  const autoCollapse = await this.stateManager.getAutoCollapse();
  if (autoCollapse) {
    await this.collapseOtherGroups(existingGroups, groupId, activeGroupId);
  }
};

TabGroupService.prototype.handleTabActivation = async function(activeInfo) {
  try {
    if (this.isDragging) return;

    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.groupId || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return;

    const groupInfo = await this.getGroupInfo(tab.url);
    if (!groupInfo) return;

    const { category } = groupInfo;
    const existingGroups = await chrome.tabGroups.query({ windowId: activeInfo.windowId });
    const targetGroupId = this.findGroupByCategory(existingGroups, category);

    if (!targetGroupId) return;

    const autoCollapse = await this.stateManager.getAutoCollapse();
    if (autoCollapse) {
      await this.collapseOtherGroups(existingGroups, targetGroupId, targetGroupId);
    }
  } catch (error) {
    console.error('[TabGroupService] Error in handleTabActivation:', error);
  }
};

/**
 * Clean up orphaned/empty Chrome tab groups that don't exist in our storage
 * This removes orphaned tab groups created by Chrome but no longer managed by us
 * 
 * @param {number|null} windowId - Optional window ID to limit cleanup scope
 * @returns {Promise<{success: boolean, removedCount: number}>}
 */
TabGroupService.prototype.cleanupEmptyGroups = async function(windowId = null) {
  try {
    // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
    const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
    const queryOptions = { windowId: targetWindowId };
    
    // Get all tabs in the window
    const tabs = await chrome.tabs.query(queryOptions);
    
    // Get all tab groups in the window
    const groups = await chrome.tabGroups.query(queryOptions);
    
    if (groups.length === 0) {
      return { success: true, removedCount: 0 };
    }
    
    // Find which group IDs actually have tabs
    const groupedTabIds = new Set(
      tabs
        .filter(t => t.groupId && t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
        .map(t => t.groupId)
    );
    
    // Find groups with no tabs (orphaned/empty groups)
    const emptyGroups = groups.filter(g => !groupedTabIds.has(g.id));
    
    let removedCount = 0;
    for (const group of emptyGroups) {
      try {
        await chrome.tabGroups.remove(group.id);
        removedCount++;
      } catch (error) {
        console.error('[TabGroupService] Failed to remove orphaned group:', group.id, error);
      }
    }
    
    return { success: true, removedCount };
  } catch (error) {
    console.error('[TabGroupService] Error cleaning up empty groups:', error);
    return { success: false, removedCount: 0, error: error.message };
  }
};

/**
 * Update all existing tab group titles to reflect current display mode
 * This is used when display mode changes without needing to re-sort tabs
 * 
 * @param {number|null} windowId - Optional window ID
 * @returns {Promise<{success: boolean, updatedCount: number}>}
 */
TabGroupService.prototype.updateGroupTitles = async function(windowId = null) {
  try {
    const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
    const queryOptions = { windowId: targetWindowId };
    
    const tabs = await chrome.tabs.query(queryOptions);
    const groups = await chrome.tabGroups.query(queryOptions);
    
    if (groups.length === 0) {
      return { success: true, updatedCount: 0 };
    }
    
    let updatedCount = 0;
    for (const group of groups) {
      const groupTabs = tabs.filter(t => t.groupId === group.id);
      
      if (groupTabs.length === 0) {
        continue;
      }
      
      const firstTab = groupTabs[0];
      const groupInfo = await this.getGroupInfo(firstTab.url);
      const categoryName = groupInfo ? groupInfo.category : null;
      
      if (!categoryName) {
        continue;
      }
      
      const tabCount = groupTabs.length;
      const newTitle = await this.formatTitle(categoryName, tabCount);
      
      if (newTitle !== group.title) {
        await this.withRetry(() => chrome.tabGroups.update(group.id, { title: newTitle }));
        updatedCount++;
      }
    }
    
    return { success: true, updatedCount };
  } catch (error) {
    console.error('[TabGroupService.updateGroupTitles] Error updating titles:', error);
    return { success: false, updatedCount: 0, error: error.message };
  }
};
