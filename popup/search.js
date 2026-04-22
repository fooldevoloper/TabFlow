function enterSearch(initialChar = '') {
  searchActive = initialChar.length > 0;
  searchBar.classList.add('active'); // Keep active class for styling if needed
  
  if (searchActive) {
    searchResults.classList.add('active');
    groupsList.classList.add('hidden');
  } else {
    searchResults.classList.remove('active');
    groupsList.classList.remove('hidden');
  }

  searchInput.value = initialChar;
  searchInput.focus();

  if (searchActive) {
    renderSearchResults(initialChar);
  }
  navIndex = -1;
  selectItem(0);
}

function exitSearch() {
  searchActive = false;
  // searchBar.classList.remove('active'); // We want search bar to stay visible
  searchResults.classList.remove('active');
  groupsList.classList.remove('hidden');
  searchInput.value = '';

  // If in focus mode, don't restore normal view - stay focused
  if (!focusedGroupId) {
    if (cachedGroupsData) {
      if (groupToggle.checked) {
        renderActiveGroups(cachedGroupsData);
      } else {
        renderDomainGroups(cachedGroupsData);
      }
    }
  }

  navIndex = -1;
  selectItem(0);
}
