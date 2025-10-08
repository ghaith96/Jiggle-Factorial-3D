/**
 * Storage Module - IndexedDB wrapper for Jiggle Factorial 3D
 * Provides offline-first storage with fallback to localStorage
 */

const DB_NAME = 'JiggleFactorial3D';
const DB_VERSION = 1;
const STORE_NAME = 'gameData';

class StorageManager {
  constructor() {
    this.db = null;
    this.isIndexedDBSupported = 'indexedDB' in window;
  }

  /**
   * Initialize the database
   */
  async init() {
    if (!this.isIndexedDBSupported) {
      console.warn('[Storage] IndexedDB not supported, falling back to localStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Storage] IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Storage] IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('sessionId', 'sessionId', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
          
          console.log('[Storage] Object store created');
        }
      };
    });
  }

  /**
   * Save data to IndexedDB or localStorage
   */
  async save(key, data) {
    // Add metadata
    const record = {
      id: key,
      data: data,
      timestamp: Date.now(),
      type: this._inferType(key)
    };

    if (this.isIndexedDBSupported && this.db) {
      return this._saveToIndexedDB(record);
    } else {
      return this._saveToLocalStorage(key, data);
    }
  }

  /**
   * Get data from IndexedDB or localStorage
   */
  async get(key) {
    if (this.isIndexedDBSupported && this.db) {
      const record = await this._getFromIndexedDB(key);
      return record ? record.data : null;
    } else {
      return this._getFromLocalStorage(key);
    }
  }

  /**
   * Delete data
   */
  async delete(key) {
    if (this.isIndexedDBSupported && this.db) {
      return this._deleteFromIndexedDB(key);
    } else {
      return this._deleteFromLocalStorage(key);
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys() {
    if (this.isIndexedDBSupported && this.db) {
      return this._getAllKeysFromIndexedDB();
    } else {
      return this._getAllKeysFromLocalStorage();
    }
  }

  /**
   * Get all records of a specific type
   */
  async getAllByType(type) {
    if (this.isIndexedDBSupported && this.db) {
      return this._getAllByTypeFromIndexedDB(type);
    } else {
      const keys = Object.keys(localStorage);
      const filtered = keys.filter(key => this._inferType(key) === type);
      return filtered.map(key => ({
        id: key,
        data: JSON.parse(localStorage.getItem(key)),
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Clear all data
   */
  async clear() {
    if (this.isIndexedDBSupported && this.db) {
      return this._clearIndexedDB();
    } else {
      localStorage.clear();
      return Promise.resolve();
    }
  }

  /**
   * Prune old data (keep last N days)
   */
  async pruneOldData(daysToKeep = 90) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    if (this.isIndexedDBSupported && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoffTime);
        const request = index.openCursor(range);
        
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // Skip settings and progress data
            if (!cursor.value.id.includes('settings') && !cursor.value.id.includes('progress')) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            console.log(`[Storage] Pruned ${deletedCount} old records`);
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } else {
      // For localStorage, we can't prune by timestamp efficiently
      return Promise.resolve(0);
    }
  }

  /**
   * Export all data to JSON
   */
  async exportData() {
    const allKeys = await this.getAllKeys();
    const exportData = {};
    
    for (const key of allKeys) {
      exportData[key] = await this.get(key);
    }
    
    return {
      version: DB_VERSION,
      exported: new Date().toISOString(),
      data: exportData
    };
  }

  /**
   * Import data from JSON
   */
  async importData(exportedData) {
    if (!exportedData || !exportedData.data) {
      throw new Error('Invalid import data');
    }

    const imported = [];
    const failed = [];

    for (const [key, value] of Object.entries(exportedData.data)) {
      try {
        await this.save(key, value);
        imported.push(key);
      } catch (error) {
        console.error(`[Storage] Failed to import ${key}:`, error);
        failed.push(key);
      }
    }

    return { imported, failed };
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const keys = await this.getAllKeys();
    const stats = {
      totalRecords: keys.length,
      storageType: this.isIndexedDBSupported && this.db ? 'IndexedDB' : 'localStorage',
      byType: {}
    };

    for (const key of keys) {
      const type = this._inferType(key);
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  // ============================================
  // Private IndexedDB Methods
  // ============================================

  _saveToIndexedDB(record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _deleteFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _getAllKeysFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _getAllByTypeFromIndexedDB(type) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _clearIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // Private localStorage Methods
  // ============================================

  _saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return Promise.resolve();
    } catch (error) {
      console.error('[Storage] localStorage save error:', error);
      return Promise.reject(error);
    }
  }

  _getFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('[Storage] localStorage get error:', error);
      return null;
    }
  }

  _deleteFromLocalStorage(key) {
    localStorage.removeItem(key);
    return Promise.resolve();
  }

  _getAllKeysFromLocalStorage() {
    return Object.keys(localStorage);
  }

  // ============================================
  // Helper Methods
  // ============================================

  _inferType(key) {
    if (key.includes('settings')) return 'settings';
    if (key.includes('progress')) return 'progress';
    if (key.includes('trial')) return 'trial';
    if (key.includes('session')) return 'session';
    return 'other';
  }
}

// Create singleton instance
const storage = new StorageManager();

// Export functions and class
export { storage, StorageManager };

// Export helper functions for common operations
export async function saveGameSettings(settings) {
  return storage.save('gameSettings', settings);
}

export async function loadGameSettings() {
  return storage.get('gameSettings');
}

export async function saveProgress(progressData) {
  return storage.save('gameProgress', progressData);
}

export async function loadProgress() {
  return storage.get('gameProgress');
}

export async function saveTrial(trialId, trialData) {
  return storage.save(`trial_${trialId}`, trialData);
}

export async function getAllTrials() {
  return storage.getAllByType('trial');
}

export async function exportToCSV(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get all unique keys from all objects
  const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj.data || obj)))];
  
  // Create CSV header
  const header = allKeys.join(',');
  
  // Create CSV rows
  const rows = data.map(record => {
    const obj = record.data || record;
    return allKeys.map(key => {
      const value = obj[key];
      // Handle values that might contain commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value !== undefined && value !== null ? value : '';
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

export function downloadCSV(csvContent, filename = 'jiggle-factorial-export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

