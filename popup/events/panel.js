const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    const tabName = btn.dataset.tab;

    // Update buttons
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update contents
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabName}Tab`) {
        content.classList.add('active');
      }
    });

    if (tabName === 'home') {
      if (focusedGroupId) {
        // Stay in focus mode if it was active
      } else {
        if (groupToggle.checked) {
          await loadActiveGroups();
        } else {
          await loadDomainGroups();
        }
      }
      searchInput.focus();
    } else if (tabName === 'settings') {
      exitSearch();
      loadConfigGroups();
    }
  });
});
