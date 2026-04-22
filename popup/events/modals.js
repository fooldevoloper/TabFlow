addGroupBtn.addEventListener('click', () => openModal('create'));
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalSave.addEventListener('click', handleSave);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

groupNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSave();
});

conflictCancel.addEventListener('click', closeConflictModal);
conflictConfirm.addEventListener('click', async () => {
  if (!pendingSave) return;

  const { name, domains } = pendingSave;
  closeConflictModal();

  try {
    await sendMessage('moveDomainsToGroup', {
      groupName: name,
      domains
    });

    closeModal();
    await loadConfigGroups();
    showStatus('Domains moved and group saved', 'success');
  } catch (e) {
    closeModal();
    showStatus('Error: ' + e.message, 'error');
  }
});

conflictModalOverlay.addEventListener('click', (e) => {
  if (e.target === conflictModalOverlay) closeConflictModal();
});
