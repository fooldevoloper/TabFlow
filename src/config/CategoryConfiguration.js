class CategoryConfiguration {
  constructor() {
    if (CategoryConfiguration.instance) {
      return CategoryConfiguration.instance;
    }

    this.categories = new Map();
    this.emojiMap = new Map(); // category -> emoji mapping
    this.fallbackCategory = 'OTHER';
    CategoryConfiguration.instance = this;
  }

  async loadDefaults() {
    try {
      const url = chrome.runtime.getURL('defaults.json');
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        this.emojiMap = new Map(); // Clear existing emojis
        for (const group of data) {
          if (group.name && Array.isArray(group.domains) && group.domains.length > 0) {
            this.categories.set(group.name.toUpperCase(), group.domains.map(d => d.toLowerCase()));
            // Load emoji if present
            if (group.emoji) {
              this.emojiMap.set(group.name.toUpperCase(), group.emoji);
            }
          }
        }
      }
    } catch (error) {
      console.error('[CategoryConfiguration] Failed to load defaults:', error);
    }
  }

  async loadFromStorage() {
    try {
      const result = await chrome.storage.sync.get('groups');
      if (result.groups && Array.isArray(result.groups) && result.groups.length > 0) {
        this.categories = new Map();
        this.emojiMap = new Map();
        for (const group of result.groups) {
          if (group.name && Array.isArray(group.domains) && group.domains.length > 0) {
            this.categories.set(group.name.toUpperCase(), group.domains.map(d => d.toLowerCase()));
            // Load emoji from user's custom group
            if (group.emoji) {
              this.emojiMap.set(group.name.toUpperCase(), group.emoji);
            }
          }
        }
        if (this.categories.size === 0) {
          await this.resetToDefaults();
        }
      } else {
        await this.loadDefaults();
      }
    } catch (error) {
      console.error('[CategoryConfiguration] Failed to load from storage:', error);
      await this.loadDefaults();
    }
  }

  async resetToDefaults() {
    this.categories = new Map();
    this.emojiMap = new Map();
    await this.loadDefaults();
  }

  findCategory(hostname) {
    if (!hostname) return null;

    for (const [category, domains] of this.categories) {
      if (this.matchesDomain(hostname, domains)) {
        return category;
      }
    }

    return this.fallbackCategory;
  }

  matchesDomain(hostname, domains) {
    const normalized = hostname.toLowerCase();
    return domains.some(domain => {
      const d = domain.toLowerCase();
      if (normalized === d) return true;
      if (normalized.endsWith('.' + d)) return true;
      
      // Check www. prefix match
      const normalizedWithoutWww = normalized.startsWith('www.') ? normalized.slice(4) : null;
      const domainWithoutWww = d.startsWith('www.') ? d.slice(4) : null;
      
      if (normalizedWithoutWww && domainWithoutWww) {
        if (normalizedWithoutWww === domainWithoutWww) return true;
        if (normalizedWithoutWww.endsWith('.' + domainWithoutWww)) return true;
      }
      
      // If one has www. and other doesn't
      if (normalizedWithoutWww && normalizedWithoutWww === d) return true;
      if (domainWithoutWww && normalized === domainWithoutWww) return true;
      
      return false;
    });
  }

  /**
   * Get the emoji for a category
   * @param {string} category - The category name
   * @returns {string} The emoji or default globe emoji
   */
  getEmoji(category) {
    return this.emojiMap.get(category?.toUpperCase()) || '🌐';
  }

  /**
   * Set or update emoji for a category
   * @param {string} name - The category name
   * @param {string} emoji - The emoji to set
   */
  setEmoji(name, emoji) {
    this.emojiMap.set(name.toUpperCase(), emoji);
  }

  setCategory(name, domains, emoji = null) {
    this.categories.set(name.toUpperCase(), domains);
    if (emoji) {
      this.emojiMap.set(name.toUpperCase(), emoji);
    }
  }

  removeCategory(name) {
    this.categories.delete(name.toUpperCase());
    this.emojiMap.delete(name.toUpperCase());
  }

  getAllCategories() {
    return new Map(this.categories);
  }

  getEmojiMap() {
    return new Map(this.emojiMap);
  }

  toStorageFormat() {
    const groups = [];
    for (const [name, domains] of this.categories) {
      const group = { 
        id: name.toLowerCase(), 
        name: name, 
        domains: domains 
      };
      // Include emoji if present
      if (this.emojiMap.has(name)) {
        group.emoji = this.emojiMap.get(name);
      }
      groups.push(group);
    }
    return groups;
  }
}
