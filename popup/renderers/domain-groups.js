function renderDomainGroups(data) {
  cachedGroupsData = data;

  if (searchActive) return;

  const { tabs, activeTabId } = data;

  const shortcutsHtml = `
    <div class="shortcuts-hint">
      <span><kbd>j</kbd> / <kbd>k</kbd> Navigate</span>
      <span><kbd>Enter</kbd> Select</span>
      <span><kbd>/</kbd> or <kbd>i</kbd> Search</span>
      <span><kbd>Esc</kbd> Exit / Close</span>
      <span><kbd>Alt+T</kbd> Open TabFlow</span>
    </div>
  `;

  if (!tabs || tabs.length === 0) {
    groupsList.innerHTML = `
      <div class="empty-state">
        <p>No open tabs</p>
      </div>
      ${shortcutsHtml}
    `;
    return;
  }

  const scrollTop = groupsList.scrollTop;

  // Render flat list - no sorting, no grouping
  const tabsHtml = tabs.map(tab => {
    const isActiveTab = tab.id === activeTabId;
    const favicon = tab.favIconUrl ? `<img class="group-tab-favicon" src="${tab.favIconUrl}" alt="">` : '';
    return `
      <div class="group-tab${isActiveTab ? ' active-tab' : ''}" data-action="focus-tab" data-tab-id="${tab.id}">
        ${favicon}
        <span class="group-tab-title">${escapeHtml(tab.title)}</span>
        <button class="group-tab-close" data-action="close-tab" data-tab-id="${tab.id}" title="Close tab">×</button>
      </div>
    `;
  }).join('');

  groupsList.innerHTML = `
    <div class="domain-group-card">
      <div class="domain-group-tabs">
        ${tabsHtml}
      </div>
    </div>
    ${shortcutsHtml}
  `;

  groupsList.scrollTop = scrollTop;
}
