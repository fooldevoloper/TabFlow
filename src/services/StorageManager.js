class StorageManager {
  static STORAGE_KEYS = {
    ENABLED: 'enabled',
    GROUPS: 'groups',
    AUTO_COLLAPSE: 'autoCollapse',
    MIGRATION_COMPLETED: 'migration_to_sync_completed'
  };

  static QUOTA_ERROR = 'QUOTA_EXCEEDED';

  static isQuotaError(error) {
    if (!error) return false;
    const message = error.message || String(error);
    return message.includes('QUOTA') || 
           message.includes('quota') ||
           message.includes('Storage') ||
           error.name === 'QuotaExceededError';
  }

  /**
   * Get current storage usage
   * @returns {Promise<{bytesInUse: number, bytesTotal: number}>}
   */
  static async getStorageUsage() {
    try {
      const { bytesInUse, QUOTA_BYTES } = await chrome.storage.sync.getBytesInUse(null);
      return {
        bytesInUse,
        bytesTotal: Constants?.LIMITS?.STORAGE_QUOTA_BYTES || QUOTA_BYTES || 102400
      };
    } catch (error) {
      console.error('[StorageManager] Failed to get storage usage:', error);
      return { bytesInUse: 0, bytesTotal: Constants?.LIMITS?.STORAGE_QUOTA_BYTES || 102400 };
    }
  }

  /**
   * Check if data will fit in storage quota
   * @param {Object} data - Data to check
   * @returns {Promise<boolean>}
   */
  static async willFitInQuota(data) {
    try {
      const usage = await this.getStorageUsage();
      const dataString = JSON.stringify(data);
      const dataSize = new Blob([dataString]).size;
      return (usage.bytesInUse + dataSize) < usage.bytesTotal;
    } catch (error) {
      return true;
    }
  }

  /**
   * Migrate data from chrome.storage.local to chrome.storage.sync
   * This ensures users don't lose their tab groups when updating to the sync version
   */
  static async migrateLocalToSync() {
    try {
      const migrationCheck = await chrome.storage.sync.get(StorageManager.STORAGE_KEYS.MIGRATION_COMPLETED);

      if (migrationCheck[StorageManager.STORAGE_KEYS.MIGRATION_COMPLETED]) {
        return;
      }


      const localData = await chrome.storage.local.get([
        StorageManager.STORAGE_KEYS.ENABLED,
        StorageManager.STORAGE_KEYS.GROUPS,
        StorageManager.STORAGE_KEYS.AUTO_COLLAPSE
      ]);

      const syncData = {};
      let hasDataToMigrate = false;

      if (localData[StorageManager.STORAGE_KEYS.ENABLED] !== undefined) {
        syncData[StorageManager.STORAGE_KEYS.ENABLED] = localData[StorageManager.STORAGE_KEYS.ENABLED];
        hasDataToMigrate = true;
      }

      if (localData[StorageManager.STORAGE_KEYS.GROUPS] !== undefined) {
        syncData[StorageManager.STORAGE_KEYS.GROUPS] = localData[StorageManager.STORAGE_KEYS.GROUPS];
        hasDataToMigrate = true;
      }

      if (localData[StorageManager.STORAGE_KEYS.AUTO_COLLAPSE] !== undefined) {
        syncData[StorageManager.STORAGE_KEYS.AUTO_COLLAPSE] = localData[StorageManager.STORAGE_KEYS.AUTO_COLLAPSE];
        hasDataToMigrate = true;
      }

      if (hasDataToMigrate) {
        await chrome.storage.sync.set(syncData);
      }

      await chrome.storage.sync.set({ [StorageManager.STORAGE_KEYS.MIGRATION_COMPLETED]: true });

    } catch (error) {
      console.error('[StorageManager] Migration failed:', error);
      throw error;
    }
  }

  /**
   * Save tab groups to sync storage
   * @param {Array} groups - Array of tab group objects
   */
  static async saveTabGroups(groups) {
    try {
      await chrome.storage.sync.set({
        [StorageManager.STORAGE_KEYS.GROUPS]: groups
      });
    } catch (error) {
      if (this.isQuotaError(error)) {
        console.error('[StorageManager] Storage quota exceeded. Consider removing unused groups.');
        const quotaError = new Error('Storage quota exceeded. Please remove some groups.');
        quotaError.code = StorageManager.QUOTA_ERROR;
        throw quotaError;
      }
      console.error('[StorageManager] Failed to save tab groups:', error);
      throw error;
    }
  }

  /**
   * Load tab groups from sync storage
   * @returns {Array} Array of tab group objects
   */
  static async loadTabGroups() {
    try {
      const result = await chrome.storage.sync.get(StorageManager.STORAGE_KEYS.GROUPS);
      return result[StorageManager.STORAGE_KEYS.GROUPS] || [];
    } catch (error) {
      console.error('[StorageManager] Failed to load tab groups:', error);
      throw error;
    }
  }

  /**
   * Generic save function for sync storage
   * @param {Object} data - Key-value pairs to save
   */
  static async saveToSync(data) {
    try {
      await chrome.storage.sync.set(data);
    } catch (error) {
      if (this.isQuotaError(error)) {
        console.error('[StorageManager] Storage quota exceeded.');
        const quotaError = new Error('Storage quota exceeded. Please remove some groups.');
        quotaError.code = StorageManager.QUOTA_ERROR;
        throw quotaError;
      }
      console.error('[StorageManager] Failed to save to sync storage:', error);
      throw error;
    }
  }

  /**
   * Generic load function for sync storage
   * @param {string|string[]} keys - Key or array of keys to load
   * @returns {Object} Retrieved data
   */
  static async loadFromSync(keys) {
    try {
      return await chrome.storage.sync.get(keys);
    } catch (error) {
      console.error('[StorageManager] Failed to load from sync storage:', error);
      throw error;
    }
  }
}
