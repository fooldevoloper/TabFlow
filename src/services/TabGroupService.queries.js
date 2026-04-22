TabGroupService.prototype.getGroupsByPosition = async function(windowId = null) {
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });

  const groupsWithPosition = groups.map(g => {
    const groupTabs = tabs.filter(t => t.groupId === g.id);
    const leftmostIndex = groupTabs.length > 0
      ? Math.min(...groupTabs.map(t => t.index))
      : Infinity;
    const titleMatch = g.title.match(/^(\d+)\.\s*(.+?)\s*\((\d+)\)$/);
    const name = titleMatch ? titleMatch[2] : g.title;
    const count = titleMatch ? parseInt(titleMatch[3]) : groupTabs.length;
    return { id: g.id, name, count, leftmostIndex };
  });

  groupsWithPosition.sort((a, b) => a.leftmostIndex - b.leftmostIndex);
  return groupsWithPosition.map((g, i) => ({
    position: i + 1,
    id: g.id,
    name: g.name,
    count: g.count
  }));
};

TabGroupService.prototype.getActiveTabGroups = async function(windowId = null) {
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  
  let groups = [];
  let retries = Constants.TIMING.RETRY_MAX_ATTEMPTS;
  while (retries > 0) {
    groups = await chrome.tabGroups.query({ windowId: targetWindowId });
    if (groups.length > 0) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, Constants.TIMING.RETRY_DELAY_MS));
    retries--;
  }
  
  if (groups.length === 0) {
    console.warn('[Service] getActiveTabGroups: WARNING - No groups found after retries');
  }
  
  const allTabs = await chrome.tabs.query({ windowId: targetWindowId });
  const activeTab = allTabs.find(t => t.active);
  const activeTabId = activeTab ? activeTab.id : null;
  const activeGroupId = activeTab && activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
    ? activeTab.groupId
    : null;

  const groupsWithTabs = groups.map(g => {
    const tabs = allTabs
      .filter(t => t.groupId === g.id)
      .map(t => ({
        id: t.id,
        title: t.title,
        url: t.url,
        favIconUrl: t.favIconUrl || ''
      }));

    return {
      id: g.id,
      title: g.title,
      color: g.color,
      collapsed: g.collapsed,
      tabs
    };
  });

  const tabIndexMap = new Map(allTabs.map(t => [t.id, t.index]));

  groupsWithTabs.sort((a, b) => {
    const aMin = a.tabs.length > 0 ? Math.min(...a.tabs.map(t => tabIndexMap.get(t.id) ?? Infinity)) : Infinity;
    const bMin = b.tabs.length > 0 ? Math.min(...b.tabs.map(t => tabIndexMap.get(t.id) ?? Infinity)) : Infinity;
    return aMin - bMin;
  });

  return {
    success: true,
    groups: groupsWithTabs,
    activeTabId,
    activeGroupId
  };
};

TabGroupService.prototype.focusGroup = async function(groupId, windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const groupTabs = tabs.filter(t => t.groupId === groupId);

  if (groupTabs.length === 0) return;

  // Collapse ALL other groups
  for (const group of groups) {
    if (group.id !== groupId) {
      await chrome.tabGroups.update(group.id, { collapsed: true });
    }
  }

  // Expand the target group
  const group = await chrome.tabGroups.get(groupId);
  if (group.collapsed) {
    await chrome.tabGroups.update(groupId, { collapsed: false });
  }

  await chrome.tabs.update(groupTabs[0].id, { active: true });
};

TabGroupService.prototype.focusTab = async function(tabId) {
  await chrome.tabs.update(tabId, { active: true });
};

/**
 * Enter focus mode: collapse all groups except the target, and return the focused group data
 * This makes other groups "disappear" from the tab bar (collapsed)
 */
TabGroupService.prototype.enterFocusMode = async function(groupId, windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const allTabs = await chrome.tabs.query({ windowId: targetWindowId });
  const activeTab = allTabs.find(t => t.active);

  // Collapse all other groups
  for (const group of groups) {
    if (group.id !== groupId) {
      await chrome.tabGroups.update(group.id, { collapsed: true });
    }
  }

  // Ensure target group is expanded
  const targetGroup = await chrome.tabGroups.get(groupId);
  if (targetGroup.collapsed) {
    await chrome.tabGroups.update(groupId, { collapsed: false });
  }

  // Return the focused group's tab data for the popup
  const groupTabs = allTabs
    .filter(t => t.groupId === groupId)
    .sort((a, b) => a.index - b.index)
    .map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl || ''
    }));

  return {
    success: true,
    focusedGroupId: groupId,
    focusedGroup: {
      id: groupId,
      title: targetGroup.title,
      color: targetGroup.color,
      collapsed: false,
      tabs: groupTabs
    },
    activeTabId: activeTab ? activeTab.id : null,
    activeGroupId: groupId
  };
};

/**
 * Exit focus mode: expand all collapsed groups
 */
TabGroupService.prototype.exitFocusMode = async function(windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });

  for (const group of groups) {
    if (group.collapsed) {
      await chrome.tabGroups.update(group.id, { collapsed: false });
    }
  }

  return { success: true };
};
