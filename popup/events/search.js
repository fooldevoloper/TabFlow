searchResults.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="focus-tab"]');
  if (!btn) return;
  sendMessage('focusTab', { tabId: parseInt(btn.dataset.tabId) });
});
