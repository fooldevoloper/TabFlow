TabGroupService.prototype.setupDragListeners = function() {
  chrome.tabs.onDetached.addListener(() => {
    this.isDragging = true;
  });
  chrome.tabs.onAttached.addListener(() => {
    this.isDragging = false;
  });
};

TabGroupService.prototype.canModifyTabs = function() {
  return !this.isDragging;
};

TabGroupService.prototype.withRetry = async function(operation, maxRetries = Constants.TIMING.RETRY_MAX_ATTEMPTS, delayMs = Constants.TIMING.RETRY_BASE_DELAY_MS) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.message.includes('cannot be edited') && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
};

TabGroupService.prototype.getGroupInfo = async function(url) {
  const hostname = this.domainExtractor.extract(url);
  if (hostname) {
    const category = this.config.findCategory(hostname);
    if (category) {
      // Check if this is the fallback category (OTHER) and respect groupUnlisted setting
      if (category === this.config.fallbackCategory) {
        const groupUnlisted = await this.stateManager.getGroupUnlisted();
        if (!groupUnlisted) {
          return null;
        }
      }
      return { category, hostname };
    }
    return null;
  }

  // For special URLs (chrome://, file://, etc.), assign to OTHER only if groupUnlisted is enabled
  if (url && typeof url === 'string' && this.isSpecialUrl(url)) {
    const groupUnlisted = await this.stateManager.getGroupUnlisted();
    if (!groupUnlisted) {
      return null;
    }
    return { category: this.config.fallbackCategory, hostname: null };
  }

  return null;
};

TabGroupService.prototype.isSpecialUrl = function(url) {
  const lower = url.toLowerCase();
  return DomainExtractor.SKIPPED_PROTOCOLS.some(protocol =>
    lower.startsWith(protocol)
  );
};

TabGroupService.prototype.formatTitle = async function(category, count) {
  const emoji = this.config.getEmoji(category);
  const displayMode = await this.stateManager.getDisplayMode();

  let title;
  switch (displayMode) {
    case StateManager.DISPLAY_MODES.ICON_NAME_COUNT:
      title = `${emoji} ${category} (${count})`;
      break;
    case StateManager.DISPLAY_MODES.ICON_NAME:
      title = `${emoji} ${category}`;
      break;
    case StateManager.DISPLAY_MODES.ICON_COUNT:
      title = `${emoji} (${count})`;
      break;
    case StateManager.DISPLAY_MODES.ICON_ONLY:
      title = emoji;
      break;
    case StateManager.DISPLAY_MODES.NAME_COUNT:
      title = `${category} (${count})`;
      break;
    case StateManager.DISPLAY_MODES.NAME_ONLY:
      title = category;
      break;
    case StateManager.DISPLAY_MODES.COUNT_ONLY:
      title = `(${count})`;
      break;
    case StateManager.DISPLAY_MODES.COUNT:
      title = `${count}`;
      break;
    default:
      title = `${emoji} ${category} (${count})`;
  }
  
  return title;
};
