async function activateItem() {
  const items = getNavItems();
  if (navIndex < 0 || navIndex >= items.length) return;

  const item = items[navIndex];

  if (item.type === 'toggle') {
    item.el.click();
  } else if (item.type === 'settings-icon') {
    item.el.click();
  } else if (item.type === 'back') {
    item.el.click();
  } else if (item.type === 'add-group') {
    item.el.click();
  } else if (item.type === 'config-action') {
    item.el.click();
  } else if (item.type === 'settings-btn') {
    item.el.click();
  } else if (item.type === 'group-header') {
    await sendMessage('focusGroup', { groupId: parseInt(item.el.dataset.groupId) }, false);
  } else if (item.type === 'group-tab' || item.type === 'search-tab') {
    await sendMessage('focusTab', { tabId: parseInt(item.el.dataset.tabId) }, false);
  } else if (item.type === 'config-group') {
    const editBtn = item.element.querySelector('.config-group-icon-btn.edit');
    if (editBtn) editBtn.click();
  }
}
