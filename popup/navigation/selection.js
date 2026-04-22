let navIndex = -1;

function clearSelection() {
  document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
}

function selectItem(index) {
  const items = getNavItems();
  if (items.length === 0) return;

  navIndex = Math.max(0, Math.min(index, items.length - 1));
  clearSelection();

  const item = items[navIndex];
  item.el.classList.add('selected');

  item.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
