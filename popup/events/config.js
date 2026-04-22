configGroupsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const group = configGroups.find(g => g.id === id);

  if (action === 'edit' && group) {
    openModal('edit', group);
  } else if (action === 'delete' && id) {
    handleDelete(id);
  }
});
