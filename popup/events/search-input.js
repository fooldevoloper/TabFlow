searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  searchActive = query.length > 0;

  if (searchActive) {
    groupsList.classList.add('hidden');
    searchResults.classList.add('active');
    renderSearchResults(query);
  } else {
    groupsList.classList.remove('hidden');
    searchResults.classList.remove('active');
  }

  navIndex = -1;
  selectItem(0);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (document.activeElement === searchInput) {
      searchInput.blur();
    } else {
      exitSearch();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activateItem().catch(console.error);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const items = getNavItems();
    if (items.length > 0) {
      selectItem((navIndex + 1) % items.length);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const items = getNavItems();
    if (items.length > 0) {
      selectItem((navIndex - 1 + items.length) % items.length);
    }
  }
});
