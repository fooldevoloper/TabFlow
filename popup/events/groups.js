groupsList.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const action = btn.dataset.action;

  if (action === 'focus-group') {
    const groupId = parseInt(btn.dataset.groupId);
    const result = await sendMessage('enterFocusMode', { groupId });
    if (result.success) {
      focusedGroupId = groupId;
      renderFocusedGroupView(result);
    }
  } else if (action === 'focus-tab') {
    await sendMessage('focusTab', { tabId: parseInt(btn.dataset.tabId) }, false);
  } else if (action === 'close-tab') {
    e.stopPropagation();
    const tabId = parseInt(btn.dataset.tabId);
    const tabEl = btn.closest('.group-tab');
    const card = btn.closest('.group-card, .domain-group-card');
    const result = await sendMessage('closeTab', { tabId });
    if (result.success) {
      if (tabEl) tabEl.remove();
      if (card && card.querySelectorAll('.group-tab').length === 0) {
        card.remove();
      }
      showStatus('Tab closed', 'success');
    }
  } else if (action === 'close-group') {
    e.stopPropagation();
    const groupId = parseInt(btn.dataset.groupId);
    const card = btn.closest('.group-card');
    const result = await sendMessage('closeGroup', { groupId });
    if (result.success) {
      if (card) card.remove();
      showStatus('Group closed', 'success');
    }
  } else if (action === 'close-domain') {
    e.stopPropagation();
    const domain = btn.dataset.domain;
    const card = btn.closest('.domain-group-card');
    const result = await sendMessage('closeTabsByDomain', { domain });
    if (result.success) {
      if (card) card.remove();
      showStatus(`Closed ${result.closedCount} tabs from ${domain}`, 'success');
    }
  } else if (action === 'exit-focus') {
    await exitFocusMode();
  }
});

let dragTabId = null;
let dragGroupId = null;

groupsList.addEventListener('dragstart', (e) => {
  const tabEl = e.target.closest('[draggable="true"]');
  if (!tabEl) return;

  dragTabId = parseInt(tabEl.dataset.dragTabId);
  dragGroupId = parseInt(tabEl.dataset.dragGroupId);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragTabId);
  tabEl.classList.add('dragging');
});

groupsList.addEventListener('dragend', (e) => {
  const tabEl = e.target.closest('.dragging');
  if (tabEl) tabEl.classList.remove('dragging');
  groupsList.querySelectorAll('.group-tabs.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragTabId = null;
  dragGroupId = null;
});

groupsList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const dropZone = e.target.closest('.group-tabs');
  groupsList.querySelectorAll('.group-tabs.drag-over').forEach(el => {
    if (el !== dropZone) el.classList.remove('drag-over');
  });
  if (dropZone) {
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drag-over');
  }
});

groupsList.addEventListener('dragleave', (e) => {
  const dropZone = e.target.closest('.group-tabs');
  if (dropZone && !dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});

groupsList.addEventListener('drop', async (e) => {
  e.preventDefault();
  const dropZone = e.target.closest('.group-tabs');
  groupsList.querySelectorAll('.group-tabs.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (!dropZone || dragTabId === null) return;

  const targetGroupId = parseInt(dropZone.dataset.dropGroupId);
  if (targetGroupId === dragGroupId) return;

  const result = await sendMessage('moveTabToGroup', { tabId: dragTabId, targetGroupId });
  if (result.success) {
    showStatus('Tab moved', 'success');
    await loadActiveGroups();
  }
});
