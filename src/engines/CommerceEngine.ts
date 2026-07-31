import { NormalizedNotification, CommerceProgress } from '../types/NormalizedNotification';

export class CommerceEngineManager {
  private orderStore: Map<string, CommerceProgress> = new Map();
  private orderListeners: Map<string, Array<(progress: CommerceProgress) => void>> = new Map();

  public handleOrderUpdate(notification: NormalizedNotification): CommerceProgress | null {
    const progress = notification.commerceMetadata;
    if (!progress) return null;

    this.orderStore.set(progress.orderId, progress);
    this.notifyOrderListeners(progress.orderId, progress);
    return progress;
  }

  public getOrderProgress(orderId: string): CommerceProgress | undefined {
    return this.orderStore.get(orderId);
  }

  public subscribeOrder(orderId: string, callback: (progress: CommerceProgress) => void): () => void {
    const current = this.orderListeners.get(orderId) || [];
    this.orderListeners.set(orderId, [...current, callback]);

    const existing = this.orderStore.get(orderId);
    if (existing) {
      callback(existing);
    }

    return () => {
      const list = this.orderListeners.get(orderId) || [];
      this.orderListeners.set(
        orderId,
        list.filter((cb) => cb !== callback)
      );
    };
  }

  private notifyOrderListeners(orderId: string, progress: CommerceProgress): void {
    const listeners = this.orderListeners.get(orderId) || [];
    listeners.forEach((cb) => cb(progress));
  }
}

export const defaultCommerceEngine = new CommerceEngineManager();
