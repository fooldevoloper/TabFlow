async function exitFocusMode() {
  focusedGroupId = null;
  groupsList.classList.remove('focus-mode');
  await sendMessage('exitFocusMode');
  await loadActiveGroups();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && focusedGroupId && !searchActive) {
    exitFocusMode();
  }
});

function renderFocusedGroupView(result) {
  const { focusedGroup, activeTabId, activeGroupId } = result;

  groupsList.classList.add('focus-mode');

  const scrollTop = groupsList.scrollTop;

  const colorHex = COLOR_MAP[focusedGroup.color] || '#9ca3af';

  const tabsHtml = focusedGroup.tabs.map(tab => {
    const isActiveTab = tab.id === activeTabId;
    const favicon = tab.favIconUrl ? `<img class="group-tab-favicon" src="${tab.favIconUrl}" alt="">` : '';
    return `
      <div class="group-tab${isActiveTab ? ' active-tab' : ''}" data-action="focus-tab" data-tab-id="${tab.id}" draggable="true" data-drag-tab-id="${tab.id}" data-drag-group-id="${focusedGroup.id}">
        ${favicon}
        <span class="group-tab-title">${escapeHtml(tab.title)}</span>
        <button class="group-tab-close" data-action="close-tab" data-tab-id="${tab.id}" title="Close tab">×</button>
      </div>
    `;
  }).join('');

  groupsList.innerHTML = `
    <div class="focus-mode-banner">
      <div class="focus-mode-info">
        <span class="group-color-dot" style="background:${colorHex}"></span>
        <span class="focus-mode-title">${escapeHtml(focusedGroup.title)}</span>
        <span class="focus-mode-count">${focusedGroup.tabs.length} tab${focusedGroup.tabs.length !== 1 ? 's' : ''}</span>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="exit-focus" title="Exit Focus Mode (Esc)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        Exit Focus Mode
      </button>
    </div>
    <div class="group-card active-group" data-group-id="${focusedGroup.id}">
      <div class="group-header" data-action="focus-group" data-group-id="${focusedGroup.id}">
        <div class="group-name">
          <span class="group-color-dot" style="background:${colorHex}"></span>
          ${escapeHtml(focusedGroup.title)}
          <span class="group-badge">${focusedGroup.tabs.length}</span>
        </div>
        <div class="group-header-actions">
          <button class="group-close" data-action="close-group" data-group-id="${focusedGroup.id}" title="Close group">×</button>
        </div>
      </div>
      <div class="group-tabs" data-drop-group-id="${focusedGroup.id}">
        ${tabsHtml}
      </div>
    </div>
  `;

  groupsList.scrollTop = scrollTop;
}
