async function loadActiveGroups() {
  try {
    // Show loading spinner
    groupsList.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading tab groups...</div>
      </div>
    `;
    
    const result = await sendMessage('getActiveTabGroups');
    
    if (result.success) {
      cachedGroupsData = result;
      
      if (result.groups.length === 0) {
        // Show empty state if no groups found
        groupsList.innerHTML = `
          <div class="empty-state">
            <p>No tab groups found</p>
            <p style="font-size:11px;margin-top:4px;">Click "Sort Tabs Now" to organize tabs</p>
          </div>
        `;
        return;
      }
      
      if (focusedGroupId) {
        // Refresh the focused group view
        const focusResult = await sendMessage('enterFocusMode', { groupId: focusedGroupId });
        if (focusResult.success) {
          renderFocusedGroupView(focusResult);
        } else {
          exitFocusMode();
          renderActiveGroups(result);
        }
      } else {
        renderActiveGroups(result);
      }
      if (searchActive) {
        renderSearchResults(searchInput.value);
        navIndex = -1;
        selectItem(0);
      }
    } else {
      groupsList.innerHTML = `
        <div class="empty-state">
          <p>Error loading groups</p>
          <p style="font-size:11px;margin-top:4px;">${result.message || 'Unknown error'}</p>
        </div>
      `;
    }
  } catch (e) {
    groupsList.innerHTML = `
      <div class="empty-state">
        <p>Error loading groups</p>
        <p style="font-size:11px;margin-top:4px;">${e.message}</p>
      </div>
    `;
  }
}

async function loadDomainGroups() {
  try {
    const result = await sendMessage('getAllTabs');
    if (result.success) {
      const activeTab = result.tabs.find(t => t.active);
      const data = { tabs: result.tabs, activeTabId: activeTab ? activeTab.id : null };
      renderDomainGroups(data);
      if (searchActive) {
        renderSearchResults(searchInput.value);
        navIndex = -1;
        selectItem(0);
      }
    }
  } catch (e) {
    console.error('Failed to load domain groups:', e);
  }
}

async function loadConfigGroups() {
  try {
    const result = await sendMessage('getGroups');
    if (result.success) {
      configGroups = result.groups;
      renderConfigGroups();
    }
  } catch (e) {
    console.error('Failed to load config groups:', e);
  }
}
