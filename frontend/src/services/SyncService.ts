import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

interface SyncQueueItem {
  id: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

interface SyncStatus {
  lastSync: string | null;
  isOnline: boolean;
  pendingChanges: number;
  lastError: string | null;
}

class SyncService {
  private static instance: SyncService;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeSyncQueue();
    this.startSyncInterval();
    this.setupOnlineStatusListener();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private initializeSyncQueue(): void {
    if (!localStorage.getItem('syncQueue')) {
      localStorage.setItem('syncQueue', JSON.stringify([]));
    }
    if (!localStorage.getItem('syncStatus')) {
      localStorage.setItem('syncStatus', JSON.stringify({
        lastSync: null,
        isOnline: navigator.onLine,
        pendingChanges: 0,
        lastError: null
      }));
    }
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    const status = this.getSyncStatus();
    status.isOnline = isOnline;
    this.updateSyncStatus(status);
    
    if (isOnline) {
      this.processSyncQueue();
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  // Queue Management
  public addToSyncQueue(type: SyncQueueItem['type'], entity: string, data: any): void {
    const queue = this.getSyncQueue();
    const item: SyncQueueItem = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      entity,
      data,
      status: 'pending',
      retryCount: 0
    };

    queue.push(item);
    this.updateSyncQueue(queue);
    this.updatePendingChangesCount();
  }

  private processSyncQueue(): void {
    const queue = this.getSyncQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) return;

    pendingItems.forEach(item => {
      try {
        this.processQueueItem(item);
      } catch (error) {
        this.handleSyncError(item, error);
      }
    });

    this.updateSyncQueue(queue);
    this.updatePendingChangesCount();
  }

  private processQueueItem(item: SyncQueueItem): void {
    // In a real application, this would make API calls
    // For now, we'll simulate successful sync
    item.status = 'synced';
    this.updateLastSync();
  }

  private handleSyncError(item: SyncQueueItem, error: any): void {
    item.retryCount++;
    if (item.retryCount >= this.MAX_RETRY_COUNT) {
      item.status = 'failed';
    }

    const status = this.getSyncStatus();
    status.lastError = error.message;
    this.updateSyncStatus(status);
  }

  // Status Management
  public getSyncStatus(): SyncStatus {
    return JSON.parse(localStorage.getItem('syncStatus') || '{}');
  }

  private updateSyncStatus(status: SyncStatus): void {
    localStorage.setItem('syncStatus', JSON.stringify(status));
  }

  private updateLastSync(): void {
    const status = this.getSyncStatus();
    status.lastSync = new Date().toISOString();
    this.updateSyncStatus(status);
  }

  private updatePendingChangesCount(): void {
    const queue = this.getSyncQueue();
    const status = this.getSyncStatus();
    status.pendingChanges = queue.filter(item => item.status === 'pending').length;
    this.updateSyncStatus(status);
  }

  // Queue Access
  private getSyncQueue(): SyncQueueItem[] {
    return JSON.parse(localStorage.getItem('syncQueue') || '[]');
  }

  private updateSyncQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem('syncQueue', JSON.stringify(queue));
  }

  // Public Methods
  public getPendingChanges(): number {
    return this.getSyncStatus().pendingChanges;
  }

  public isOnline(): boolean {
    return this.getSyncStatus().isOnline;
  }

  public getLastSyncTime(): string | null {
    return this.getSyncStatus().lastSync;
  }

  public getLastError(): string | null {
    return this.getSyncStatus().lastError;
  }

  public clearSyncQueue(): void {
    localStorage.setItem('syncQueue', JSON.stringify([]));
    this.updatePendingChangesCount();
  }

  public retryFailedItems(): void {
    const queue = this.getSyncQueue();
    const failedItems = queue.filter(item => item.status === 'failed');
    
    failedItems.forEach(item => {
      item.status = 'pending';
      item.retryCount = 0;
    });

    this.updateSyncQueue(queue);
    this.updatePendingChangesCount();
    
    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }
}

export default SyncService; 