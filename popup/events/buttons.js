resetGroupsBtn.addEventListener('click', async () => {
  if (!confirm('Reset all groups to defaults? This cannot be undone.')) return;

  try {
    const result = await sendMessage('resetGroups');
    if (result.success) {
      showStatus('Groups reset to defaults', 'success');
      await loadConfigGroups();
    } else {
      showStatus(result.message || 'Failed to reset', 'error');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
});

sortNowBtn.addEventListener('click', async () => {
  try {
    // Close settings panel first to show loading state
    if (settingsPanel.classList.contains('open')) {
      settingsPanel.classList.remove('open');
    }
    
    // Show loading spinner immediately
    groupsList.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Sorting tabs into groups...</div>
      </div>
    `;
    
    const result = await sendMessage('groupTabs');
    if (result.success) {
      showStatus(`Grouped ${result.groupedCount} domain${result.groupedCount !== 1 ? 's' : ''}`, 'success');
      // Update the toggle state to reflect that grouping is now enabled
      groupToggle.checked = true;
      expandAllBtn.style.display = '';
      // Refresh the active groups view to show newly created tab groups
      await loadActiveGroups();
    } else {
      showStatus(result.message || 'Failed', 'error');
      // Show empty state on failure
      groupsList.innerHTML = `
        <div class="empty-state">
          <p>Failed to sort tabs</p>
          <p style="font-size:11px;margin-top:4px;">${result.message || 'Try again'}</p>
        </div>
      `;
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    groupsList.innerHTML = `
      <div class="empty-state">
        <p>Error sorting tabs</p>
        <p style="font-size:11px;margin-top:4px;">${e.message}</p>
      </div>
    `;
  }
});

ungroupBtn.addEventListener('click', async () => {
  try {
    const result = await sendMessage('ungroupAll');
    if (result.success) {
      showStatus(`Ungrouped ${result.ungroupedCount} tab${result.ungroupedCount !== 1 ? 's' : ''}`, 'success');
    } else {
      showStatus(result.message || 'Failed', 'error');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
});

expandAllBtn.addEventListener('click', async () => {
  try {
    const result = await sendMessage('toggleAllGroups');
    if (result.success) {
      await loadActiveGroups();
    } else {
      showStatus(result.message || 'Failed', 'error');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
});

autoCollapseToggle.addEventListener('change', async () => {
  try {
    await sendMessage('setAutoCollapse', { enabled: autoCollapseToggle.checked });
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    autoCollapseToggle.checked = !autoCollapseToggle.checked;
  }
});

duplicatePreventionToggle.addEventListener('change', async () => {
  try {
    const result = await sendMessage('setDuplicatePrevention', { enabled: duplicatePreventionToggle.checked });
    if (result.cleanupPerformed && result.closedCount > 0) {
      showStatus(`Closed ${result.closedCount} duplicate tab${result.closedCount !== 1 ? 's' : ''}`, 'success');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    duplicatePreventionToggle.checked = !duplicatePreventionToggle.checked;
  }
});

groupUnlistedToggle.addEventListener('change', async () => {
  try {
    await sendMessage('setGroupUnlisted', { enabled: groupUnlistedToggle.checked });
    if (groupUnlistedToggle.checked) {
      showStatus('Unlisted tabs will be grouped into OTHER', 'success');
    } else {
      showStatus('Unlisted tabs will not be grouped', 'success');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    groupUnlistedToggle.checked = !groupUnlistedToggle.checked;
  }
});

displayModeSelect.addEventListener('change', async () => {
  try {
    await sendMessage('setDisplayMode', { mode: displayModeSelect.value });
    
    const result = await sendMessage('updateGroupTitles');
    
    if (result.success) {
      if (result.updatedCount > 0) {
        showStatus(`✓ Display mode applied to browser tab bar! (${result.updatedCount} group${result.updatedCount !== 1 ? 's' : ''} updated)`, 'success');
      } else {
        showStatus(`Display mode saved. Sort tabs to see the effect.`, 'success');
      }
    } else {
      showStatus(`Error: ${result.message}`, 'error');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
    const result = await sendMessage('getDisplayMode');
    displayModeSelect.value = result.mode;
  }
});
