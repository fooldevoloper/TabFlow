function renderConfigGroups() {
  // Settings panel ALWAYS shows full info for clarity
  // Display mode ONLY affects Chrome tab groups, not settings
  if (configGroups.length === 0) {
    configGroupsList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <p>No groups configured yet.</p>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('addGroupBtn').click()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create your first group
        </button>
      </div>
    `;
    return;
  }

  configGroupsList.innerHTML = configGroups.map(group => {
    // Always show full info in settings panel for clarity
    const iconDisplay = group.emoji
      ? `<span class="config-group-emoji">${escapeHtml(group.emoji)}</span>`
      : `<svg class="config-group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>`;

    return `
    <div class="config-group-card" data-id="${escapeHtml(group.id)}">
      <div class="config-group-header">
        <div class="config-group-name">
          ${iconDisplay}
          ${escapeHtml(group.name)}
          <span class="group-badge">${group.domains.length}</span>
        </div>
        <div class="config-group-actions">
          <button class="config-group-icon-btn edit" data-action="edit" data-id="${escapeHtml(group.id)}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="config-group-icon-btn delete" data-action="delete" data-id="${escapeHtml(group.id)}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="config-group-domains">
        ${group.domains.map(d => `<span class="domain-tag">${escapeHtml(d)}</span>`).join('')}
      </div>
    </div>
  `}).join('');
}
