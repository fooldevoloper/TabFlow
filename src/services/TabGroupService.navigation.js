TabGroupService.prototype.switchToGroup = async function(groupIndex, windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });

  const groupsWithPosition = groups.map(g => {
    const groupTabs = tabs.filter(t => t.groupId === g.id);
    const leftmostIndex = groupTabs.length > 0
      ? Math.min(...groupTabs.map(t => t.index))
      : Infinity;
    return { ...g, leftmostIndex };
  });

  groupsWithPosition.sort((a, b) => a.leftmostIndex - b.leftmostIndex);

  const targetGroup = groupsWithPosition[groupIndex - 1];

  if (!targetGroup) {
    return { success: false, message: `Group ${groupIndex} not found` };
  }

  const groupTabs = tabs.filter(t => t.groupId === targetGroup.id);
  if (groupTabs.length === 0) {
    return { success: false, message: `Group ${groupIndex} has no tabs` };
  }

  await chrome.tabGroups.update(targetGroup.id, { collapsed: false });
  await chrome.tabs.update(groupTabs[0].id, { active: true });

  return { success: true, groupIndex, groupId: targetGroup.id };
};

TabGroupService.prototype.switchToAdjacentGroup = async function(direction, windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });

  const groupsWithPosition = groups.map(g => {
    const groupTabs = tabs.filter(t => t.groupId === g.id);
    const leftmostIndex = groupTabs.length > 0
      ? Math.min(...groupTabs.map(t => t.index))
      : Infinity;
    return { ...g, leftmostIndex };
  });

  groupsWithPosition.sort((a, b) => a.leftmostIndex - b.leftmostIndex);

  const activeTab = tabs.find(t => t.active);
  const activeTabInGroup = activeTab && activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE;

  if (!activeTabInGroup) {
    if (groupsWithPosition.length > 0) {
      const target = direction > 0 ? groupsWithPosition[0] : groupsWithPosition[groupsWithPosition.length - 1];
      const targetTabs = tabs.filter(t => t.groupId === target.id);
      await chrome.tabGroups.update(target.id, { collapsed: false });
      await chrome.tabs.update(targetTabs[0].id, { active: true });
      return { success: true };
    } else {
      const currentIndex = tabs.findIndex(t => t.active);
      let targetIndex = currentIndex + direction;
      if (targetIndex < 0) targetIndex = tabs.length - 1;
      if (targetIndex >= tabs.length) targetIndex = 0;
      await chrome.tabs.update(tabs[targetIndex].id, { active: true });
      return { success: true };
    }
  }

  const currentGroup = groupsWithPosition.find(g => g.id === activeTab.groupId);
  const currentIndex = currentGroup ? groupsWithPosition.findIndex(g => g.id === activeTab.groupId) : -1;
  const isExpanded = currentGroup && !currentGroup.collapsed;

  if (isExpanded && currentGroup) {
    const groupTabs = tabs.filter(t => t.groupId === currentGroup.id).sort((a, b) => a.index - b.index);
    const currentTabIndexInGroup = groupTabs.findIndex(t => t.id === activeTab.id);

    let targetTabIndex = currentTabIndexInGroup + direction;
    if (targetTabIndex < 0 || targetTabIndex >= groupTabs.length) {
      let nextGroupIndex = currentIndex + direction;
      if (nextGroupIndex < 0) nextGroupIndex = groupsWithPosition.length - 1;
      if (nextGroupIndex >= groupsWithPosition.length) nextGroupIndex = 0;

      const nextGroup = groupsWithPosition[nextGroupIndex];
      const nextGroupTabs = tabs.filter(t => t.groupId === nextGroup.id);
      await chrome.tabGroups.update(nextGroup.id, { collapsed: false });
      await chrome.tabs.update(nextGroupTabs[0].id, { active: true });
    } else {
      await chrome.tabs.update(groupTabs[targetTabIndex].id, { active: true });
    }
    return { success: true };
  }

  if (currentIndex === -1) {
    const target = direction > 0 ? groupsWithPosition[0] : groupsWithPosition[groupsWithPosition.length - 1];
    const targetTabs = tabs.filter(t => t.groupId === target.id);
    await chrome.tabGroups.update(target.id, { collapsed: false });
    await chrome.tabs.update(targetTabs[0].id, { active: true });
    return { success: true };
  }

  let targetIndex = currentIndex + direction;
  if (targetIndex < 0) targetIndex = groupsWithPosition.length - 1;
  if (targetIndex >= groupsWithPosition.length) targetIndex = 0;

  const target = groupsWithPosition[targetIndex];
  const targetTabs = tabs.filter(t => t.groupId === target.id);
  await chrome.tabGroups.update(target.id, { collapsed: false });
  await chrome.tabs.update(targetTabs[0].id, { active: true });

  return { success: true };
};

TabGroupService.prototype.toggleCurrentGroup = async function(windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const tabs = await chrome.tabs.query({ windowId: targetWindowId });
  const activeTab = tabs.find(t => t.active);

  if (!activeTab || !activeTab.groupId || activeTab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    return { success: false, message: 'Active tab is not in a group' };
  }

  const group = await chrome.tabGroups.get(activeTab.groupId);
  await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });

  return { success: true, collapsed: !group.collapsed };
};

TabGroupService.prototype.toggleAllGroups = async function(windowId = null) {
  // CRITICAL FIX: Use getLastFocused to get the actual browser window, not the popup window
  const targetWindowId = windowId || (await chrome.windows.getLastFocused()).id;
  const groups = await chrome.tabGroups.query({ windowId: targetWindowId });

  if (groups.length === 0) {
    return { success: false, message: 'No tab groups found' };
  }

  const anyExpanded = groups.some(g => !g.collapsed);
  const newState = anyExpanded;

  for (const group of groups) {
    await chrome.tabGroups.update(group.id, { collapsed: newState });
  }

  return { success: true, collapsed: newState };
};
