async function executeSave(name, domains, emoji = null) {
  try {
    const dedupedDomains = [...new Set(domains)];

    if (editingGroupId) {
      const result = await sendMessage('updateGroup', { 
        id: editingGroupId, 
        name, 
        domains: dedupedDomains,
        emoji
      });
      if (result.success) {
        showStatus('Group updated', 'success');
        await loadConfigGroups();
        closeModal();
      } else {
        showStatus(result.message || 'Failed to update', 'error');
      }
    } else {
      const result = await sendMessage('addGroup', { name, domains: dedupedDomains, emoji });
      if (result.success) {
        showStatus('Group created', 'success');
        await loadConfigGroups();
        closeModal();
      } else {
        showStatus(result.message || 'Failed to create', 'error');
      }
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
}

async function handleSave() {
  const name = groupNameInput.value.trim();
  const emoji = groupEmojiInput.value.trim() || null;
  const domains = parseDomains(groupDomainsInput.value);

  if (!name) {
    showStatus('Group name is required', 'error');
    return;
  }

  if (domains.length === 0) {
    showStatus('At least one domain is required', 'error');
    return;
  }

  try {
    const conflictResult = await sendMessage('checkDomainConflicts', {
      domains,
      excludeGroupId: editingGroupId
    });

    if (conflictResult.success && (conflictResult.conflicts.length > 0 || conflictResult.duplicates.length > 0)) {
      pendingSave = { name, domains, emoji };
      openConflictModal(conflictResult.conflicts, conflictResult.duplicates, name);
      return;
    }

    await executeSave(name, domains, emoji);
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
}

async function handleDelete(id) {
  if (!confirm('Delete this group?')) return;

  try {
    const result = await sendMessage('deleteGroup', { id });
    if (result.success) {
      showStatus('Group deleted', 'success');
      await loadConfigGroups();
    } else {
      showStatus(result.message || 'Failed to delete', 'error');
    }
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
}
