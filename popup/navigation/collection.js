function getNavItems() {
  const mainVisible = document.getElementById('mainContent').style.display !== 'none';
  const settingsOpen = settingsPanel.classList.contains('open');
  const modalOpen = modalOverlay.classList.contains('open');
  const conflictOpen = conflictModalOverlay.classList.contains('open');

  if (modalOpen || conflictOpen) return [];

  const items = [];

  if (mainVisible && !settingsOpen) {
    if (searchActive) {
      document.querySelectorAll('.search-tab[data-action="focus-tab"]').forEach(el => {
        items.push({ el, type: 'search-tab' });
      });
    } else if (groupToggle.checked) {
      items.push({ el: groupToggle, type: 'toggle' });
      items.push({ el: settingsIcon, type: 'settings-icon' });

      document.querySelectorAll('.group-card').forEach(card => {
        const header = card.querySelector('.group-header[data-action="focus-group"]');
        if (header) items.push({ el: header, type: 'group-header' });

        card.querySelectorAll('.group-tab[data-action="focus-tab"]').forEach(el => {
          items.push({ el, type: 'group-tab' });
        });
      });
    } else {
      items.push({ el: groupToggle, type: 'toggle' });
      items.push({ el: settingsIcon, type: 'settings-icon' });

      document.querySelectorAll('.domain-group-card').forEach(card => {
        const header = card.querySelector('.domain-group-header');
        if (header) items.push({ el: header, type: 'domain-header' });

        card.querySelectorAll('.group-tab[data-action="focus-tab"]').forEach(el => {
          items.push({ el, type: 'group-tab' });
        });
      });
    }
  }

  if (settingsOpen) {
    const backBtn = document.getElementById('settingsBack');
    if (backBtn) items.push({ el: backBtn, type: 'back' });

    const addBtn = document.getElementById('addGroupBtn');
    if (addBtn) items.push({ el: addBtn, type: 'add-group' });

    document.querySelectorAll('.config-group-card').forEach(el => {
      items.push({ el, type: 'config-group', element: el });
    });

    document.querySelectorAll('.config-group-icon-btn[data-action]').forEach(el => {
      items.push({ el, type: 'config-action' });
    });

    document.querySelectorAll('.settings-btn').forEach(el => {
      items.push({ el, type: 'settings-btn' });
    });
  }

  return items;
}
