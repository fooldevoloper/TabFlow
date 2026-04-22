function openModal(mode, group = null) {
  editingGroupId = mode === 'edit' ? group.id : null;
  modalTitle.textContent = mode === 'edit' ? 'Edit Group' : 'New Group';
  groupNameInput.value = mode === 'edit' ? group.name : '';
  groupEmojiInput.value = mode === 'edit' ? (group.emoji || '') : '';
  groupDomainsInput.value = mode === 'edit' ? group.domains.join('\n') : '';
  
  // Update emoji quick select to show selected state
  updateEmojiSelection();
  
  modalOverlay.classList.add('open');
  groupNameInput.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingGroupId = null;
  groupNameInput.value = '';
  groupEmojiInput.value = '';
  groupDomainsInput.value = '';
  // Clear emoji selection
  document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
}

/**
 * Update the selected state of emoji options based on current input value
 */
function updateEmojiSelection() {
  const currentEmoji = groupEmojiInput.value.trim();
  document.querySelectorAll('.emoji-option').forEach(option => {
    const emoji = option.getAttribute('data-emoji');
    if (emoji === currentEmoji) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

function openConflictModal(conflicts, duplicates, targetGroupName) {
  const duplicateRows = duplicates.map(d => `
    <div class="conflict-row">
      <span class="conflict-domain">${d.domain}</span>
      <span class="conflict-arrow">&#215;</span>
      <span class="conflict-target" style="color:var(--warning)">${d.count}x</span>
    </div>
  `).join('');

  const conflictRows = conflicts.map(c => `
    <div class="conflict-row">
      <span class="conflict-domain">${c.domain}</span>
      <span class="conflict-arrow">&#8594;</span>
      <span class="conflict-target">${c.existingGroup}</span>
    </div>
  `).join('');

  let bodyHtml = '';

  if (duplicates.length > 0) {
    bodyHtml += `
      <div class="conflict-section">
        <div class="conflict-section-title">Duplicates in this input</div>
        ${duplicateRows}
      </div>
    `;
  }

  if (conflicts.length > 0) {
    bodyHtml += `
      <div class="conflict-section">
        <div class="conflict-section-title">Already in other groups</div>
        ${conflictRows}
      </div>
    `;
  }

  bodyHtml += `<p style="font-size:12px;color:var(--text-muted);margin-top:12px;">Duplicates will be removed (saved once). Domains from other groups will be moved to <strong style="color:var(--accent)">${targetGroupName.toUpperCase()}</strong>.</p>`;

  conflictBody.innerHTML = bodyHtml;
  conflictModalOverlay.classList.add('open');
}

function closeConflictModal() {
  conflictModalOverlay.classList.remove('open');
  pendingSave = null;
}

// Emoji quick select event handlers (attached immediately for popup)
document.querySelectorAll('.emoji-option').forEach(option => {
  option.addEventListener('click', () => {
    const emoji = option.getAttribute('data-emoji');
    groupEmojiInput.value = emoji;
    updateEmojiSelection();
  });
});

// Update selection when emoji input changes
groupEmojiInput.addEventListener('input', () => {
  updateEmojiSelection();
});
