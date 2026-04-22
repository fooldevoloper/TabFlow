groupToggle.addEventListener('change', async () => {
  groupToggle.disabled = true;
  expandAllBtn.style.display = groupToggle.checked ? '' : 'none';

  try {
    if (groupToggle.checked) {
      const result = await sendMessage('groupTabs');
      if (result.success) {
        showStatus(`Grouped ${result.groupedCount} domain${result.groupedCount !== 1 ? 's' : ''}`, 'success');
        await loadActiveGroups();
      } else {
        showStatus(result.message || 'Failed', 'error');
        groupToggle.checked = false;
        expandAllBtn.style.display = 'none';
      }
    } else {
      const result = await sendMessage('ungroupAll');
      if (result.success) {
        showStatus(`Ungrouped ${result.ungroupedCount} tab${result.ungroupedCount !== 1 ? 's' : ''}`, 'success');
        await loadDomainGroups();
      } else {
        showStatus(result.message || 'Failed', 'error');
        groupToggle.checked = true;
        expandAllBtn.style.display = '';
      }
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    groupToggle.checked = !groupToggle.checked;
    expandAllBtn.style.display = groupToggle.checked ? '' : 'none';
  }

  groupToggle.disabled = false;
  searchInput.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.target === searchInput && e.key === 'Escape') {
      exitSearch();
    }
    return;
  }

  if (e.key === 'Escape') {
    if (modalOverlay.classList.contains('open')) {
      closeModal();
    } else if (conflictModalOverlay.classList.contains('open')) {
      closeConflictModal();
    } else if (searchActive) {
      exitSearch();
    } else if (settingsPanel.classList.contains('open')) {
      settingsBack.click();
    } else if (focusedGroupId) {
      exitFocusMode();
    }
    return;
  }

  if (e.key === '/' || e.key === 'i' || e.key === 'I') {
    e.preventDefault();
    enterSearch();
  } else if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
    e.preventDefault();
    const items = getNavItems();
    if (items.length === 0) return;
    if (navIndex < 0) {
      selectItem(0);
    } else {
      selectItem((navIndex + 1) % items.length);
    }
  } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = getNavItems();
    if (items.length === 0) return;
    if (navIndex < 0) {
      selectItem(items.length - 1);
    } else {
      selectItem((navIndex - 1 + items.length) % items.length);
    }
  } else if (e.key === 'l' || e.key === 'L' || e.key === 'Enter' || e.key === 'ArrowRight') {
    e.preventDefault();
    activateItem().catch(console.error);
  } else if (e.key === 'h' || e.key === 'H' || e.key === 'ArrowLeft') {
    e.preventDefault();
    if (settingsPanel.classList.contains('open')) {
      settingsBack.click();
    } else if (modalOverlay.classList.contains('open')) {
      closeModal();
    } else if (conflictModalOverlay.classList.contains('open')) {
      closeConflictModal();
    } else if (searchActive) {
      exitSearch();
    } else if (focusedGroupId) {
      exitFocusMode();
    }
  }
});

(async () => {
  const isSidePanel = new URLSearchParams(window.location.search).get('context') === 'sidepanel';
  if (isSidePanel) {
    document.body.classList.add('sidepanel-mode');
  } else {
    document.body.classList.add('popup-mode');
  }

  try {
    const state = await sendMessage('getState');
    groupToggle.checked = state.enabled;

    const autoCollapse = await sendMessage('getAutoCollapse');
    autoCollapseToggle.checked = autoCollapse.autoCollapse;

    const duplicatePrevention = await sendMessage('getDuplicatePrevention');
    duplicatePreventionToggle.checked = duplicatePrevention.enabled;

    const groupUnlisted = await sendMessage('getGroupUnlisted');
    groupUnlistedToggle.checked = groupUnlisted.enabled;

    const displayMode = await sendMessage('getDisplayMode');
    displayModeSelect.value = displayMode.mode;

    const uiMode = await sendMessage('getUiMode');
    uiModeToggle.checked = uiMode.mode === 'sidepanel';
  } catch (e) {
    console.error('Failed to get settings:', e);
  }

  expandAllBtn.style.display = groupToggle.checked ? '' : 'none';

  if (groupToggle.checked) {
    await loadActiveGroups();
  } else {
    await loadDomainGroups();
  }

  requestAnimationFrame(() => {
    searchInput.focus();
    selectItem(0);
  });
})();

uiModeToggle.addEventListener('change', async () => {
  const mode = uiModeToggle.checked ? 'sidepanel' : 'popup';
  await sendMessage('setUiMode', { mode });
  showStatus(`UI Mode switched to ${mode === 'sidepanel' ? 'Side Panel' : 'Popup'}. Click the extension icon to see changes.`, 'success');
});
