import NativeRNNOSModule from '../native/NativeRNNOSModule';

export class BadgeEngineManager {
  private currentCount = 0;
  private listeners: Array<(count: number) => void> = [];

  public async setBadgeCount(count: number): Promise<void> {
    this.currentCount = Math.max(0, count);
    try {
      await NativeRNNOSModule.setBadgeCount(this.currentCount);
    } catch (e) {
      console.warn('[RNNOS BadgeEngine] Failed to set native badge count', e);
    }
    this.notifyListeners();
  }

  public async incrementBadge(amount = 1): Promise<void> {
    await this.setBadgeCount(this.currentCount + amount);
  }

  public async decrementBadge(amount = 1): Promise<void> {
    await this.setBadgeCount(Math.max(0, this.currentCount - amount));
  }

  public async getBadgeCount(): Promise<number> {
    try {
      const nativeCount = await NativeRNNOSModule.getBadgeCount();
      this.currentCount = nativeCount;
    } catch (e) {
      // Fallback to internal count
    }
    return this.currentCount;
  }

  public subscribeBadge(callback: (count: number) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentCount);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentCount));
  }
}

export const defaultBadgeEngine = new BadgeEngineManager();
