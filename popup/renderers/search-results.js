function renderSearchResults(query) {
  if (!cachedGroupsData) {
    searchResults.innerHTML = '<div class="search-empty">No tabs available</div>';
    return;
  }

  const lowerQuery = query.toLowerCase();
  let allTabs = [];

  if (cachedGroupsData.tabs) {
    cachedGroupsData.tabs.forEach(tab => {
      if (!query || tab.title.toLowerCase().includes(lowerQuery) || tab.url.toLowerCase().includes(lowerQuery)) {
        const domain = extractDomain(tab.url) || 'Other';
        allTabs.push({
          ...tab,
          groupName: domain,
          groupColor: 'grey'
        });
      }
    });
  } else if (cachedGroupsData.groups) {
    cachedGroupsData.groups.forEach(group => {
      group.tabs.forEach(tab => {
        if (!query || tab.title.toLowerCase().includes(lowerQuery)) {
          allTabs.push({
            ...tab,
            groupName: group.title,
            groupColor: group.color
          });
        }
      });
    });
  }

  if (allTabs.length === 0) {
    searchResults.innerHTML = '<div class="search-empty">No matching tabs</div>';
    return;
  }

  searchResults.innerHTML = allTabs.map(tab => {
    const colorHex = COLOR_MAP[tab.groupColor] || '#9ca3af';
    const sanitizedFaviconUrl = sanitizeFaviconUrl(tab.favIconUrl);
    const favicon = sanitizedFaviconUrl ? `<img class="search-tab-favicon" src="${sanitizedFaviconUrl}" alt="">` : '';
    return `
      <div class="search-tab" data-action="focus-tab" data-tab-id="${tab.id}">
        ${favicon}
        <span class="search-tab-title">${escapeHtml(tab.title)}</span>
        <span class="search-tab-group" style="border-left:2px solid ${colorHex}">${escapeHtml(tab.groupName)}</span>
      </div>
    `;
  }).join('');
}
