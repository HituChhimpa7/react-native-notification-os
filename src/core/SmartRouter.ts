import { NormalizedNotification } from '../types/NormalizedNotification';

export type NavigationHandler = (deepLink: string, data: Record<string, any>) => void;

export class SmartRouter {
  private navigationHandler: NavigationHandler | null = null;
  private pendingDeepLink: { deepLink: string; data: Record<string, any> } | null = null;

  public setNavigationHandler(handler: NavigationHandler): void {
    this.navigationHandler = handler;
    if (this.pendingDeepLink) {
      handler(this.pendingDeepLink.deepLink, this.pendingDeepLink.data);
      this.pendingDeepLink = null;
    }
  }

  public handleNotificationTap(notification: NormalizedNotification, actionId?: string): void {
    const targetLink = notification.deepLink || notification.data?.deepLink || notification.data?.url;

    if (!targetLink) {
      return;
    }

    const payloadData = {
      ...notification.data,
      notificationId: notification.id,
      threadId: notification.threadId,
      actionId,
    };

    if (this.navigationHandler) {
      this.navigationHandler(targetLink, payloadData);
    } else {
      // Enqueue cold-start deep link for execution when navigator is mounted
      this.pendingDeepLink = { deepLink: targetLink, data: payloadData };
    }
  }

  public getPendingDeepLink() {
    return this.pendingDeepLink;
  }
}

export const defaultSmartRouter = new SmartRouter();
