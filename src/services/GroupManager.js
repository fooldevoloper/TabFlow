class GroupManager {
  constructor(config, stateManager) {
    this.config = config;
    this.stateManager = stateManager;
  }

  async getGroups() {
    const groups = await this.stateManager.getGroups();
    if (groups.length === 0) {
      return this.config.toStorageFormat();
    }
    return this.assignSequentialIds(groups);
  }

  assignSequentialIds(groups) {
    return groups.map((group, index) => ({
      ...group,
      id: String(index + 1)
    }));
  }

  async addGroup(name, domains, emoji = null) {
    const groups = await this.getGroups();
    const id = String(groups.length + 1);
    const normalizedDomains = domains.map(d => d.toLowerCase().replace(/^www\./, ''));
    const groupName = name.toUpperCase();
    
    const group = { id, name: groupName, domains: normalizedDomains };
    if (emoji) {
      group.emoji = emoji;
    }
    
    groups.push(group);
    await this.stateManager.setGroups(groups);
    this.syncConfig(groups);
    return group;
  }

  /**
   * Check if a domain/pattern conflicts with existing groups
   * Only flags exact duplicate domains in OTHER groups
   * Prefix patterns like "google.com" and "google.com/docs" can coexist
   */
  async findDomainConflicts(domains, excludeGroupId = null) {
    const allGroups = await this.getGroups();
    const normalizedDomains = domains.map(d => d.toLowerCase().replace(/^www\./, '').replace(/\/+$/, ''));

    const duplicates = [];
    const seen = new Map();
    for (const domain of normalizedDomains) {
      seen.set(domain, (seen.get(domain) || 0) + 1);
    }
    for (const [domain, count] of seen) {
      if (count > 1) {
        duplicates.push({ domain, count });
      }
    }

    const uniqueDomains = [...new Set(normalizedDomains)];
    const conflicts = [];
    const clean = [];

    const currentGroup = excludeGroupId ? allGroups.find(g => String(g.id) === String(excludeGroupId)) : null;
    const currentGroupDomains = currentGroup ? currentGroup.domains.map(d => d.toLowerCase().replace(/^www\./, '').replace(/\/+$/, '')) : [];

    for (const domain of uniqueDomains) {
      const inCurrentGroup = currentGroupDomains.includes(domain);

      if (inCurrentGroup) {
        continue;
      }

      // Only check for exact match in other groups
      let found = false;
      for (const group of allGroups) {
        if (excludeGroupId && String(group.id) === String(excludeGroupId)) {
          continue;
        }
        const groupDomains = group.domains.map(d => d.toLowerCase().replace(/^www\./, '').replace(/\/+$/, ''));
        
        // Only exact match is a conflict
        if (groupDomains.includes(domain)) {
          conflicts.push({
            domain,
            existingGroup: group.name
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        clean.push(domain);
      }
    }

    return { duplicates, conflicts, clean };
  }

  async updateGroup(id, name, domains, emoji = null) {
    const groups = await this.getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error('Group not found');
    }
    const normalizedDomains = domains.map(d => d.toLowerCase().replace(/^www\./, ''));
    const groupName = name.toUpperCase();
    
    groups[index] = { ...groups[index], name: groupName, domains: normalizedDomains };
    
    // Update or remove emoji
    if (emoji) {
      groups[index].emoji = emoji;
    } else {
      delete groups[index].emoji;
    }
    
    await this.stateManager.setGroups(groups);
    this.syncConfig(groups);
    return groups[index];
  }

  async moveDomainsToGroup(targetGroupName, domains) {
    const groups = await this.getGroups();
    const normalizedDomains = domains.map(d => d.toLowerCase().replace(/^www\./, ''));
    
    let targetGroup = groups.find(g => g.name.toUpperCase() === targetGroupName.toUpperCase());
    
    if (!targetGroup) {
      const id = String(groups.length + 1);
      targetGroup = { id, name: targetGroupName.toUpperCase(), domains: [] };
      groups.push(targetGroup);
    }
    
    const existingDomains = new Set(targetGroup.domains);
    for (const domain of normalizedDomains) {
      existingDomains.add(domain);
    }
    targetGroup.domains = Array.from(existingDomains);
    
    const uniqueDomains = [...new Set(normalizedDomains)];
    for (const domain of uniqueDomains) {
      for (const group of groups) {
        if (group.name.toUpperCase() !== targetGroupName.toUpperCase()) {
          const domainIndex = group.domains.indexOf(domain);
          if (domainIndex !== -1) {
            group.domains.splice(domainIndex, 1);
          }
        }
      }
    }
    
    await this.stateManager.setGroups(groups);
    this.syncConfig(groups);
    return targetGroup;
  }

  async deleteGroup(id) {
    const groups = await this.getGroups();
    const filtered = groups.filter(g => g.id !== id);
    if (filtered.length === groups.length) {
      throw new Error('Group not found');
    }
    const reassigned = this.assignSequentialIds(filtered);
    await this.stateManager.setGroups(reassigned);
    this.syncConfig(reassigned);
    return reassigned;
  }

  async resetToDefaults() {
    await this.config.resetToDefaults();
    const groups = this.config.toStorageFormat();
    const groupsWithIds = this.assignSequentialIds(groups);
    await this.stateManager.setGroups(groupsWithIds);
    this.syncConfig(groupsWithIds);
    return groupsWithIds;
  }

  syncConfig(groups) {
    this.config.categories = new Map();
    this.config.emojiMap = new Map();
    for (const group of groups) {
      if (group.name && Array.isArray(group.domains) && group.domains.length > 0) {
        this.config.categories.set(group.name.toUpperCase(), group.domains);
        // Sync emoji if present
        if (group.emoji) {
          this.config.emojiMap.set(group.name.toUpperCase(), group.emoji);
        }
      }
    }
  }
}
