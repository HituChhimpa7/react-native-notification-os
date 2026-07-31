import { NormalizedNotification, RNNOSPlugin } from '../types/NormalizedNotification';

export class PluginManager {
  private plugins: RNNOSPlugin[] = [];

  public registerPlugin(plugin: RNNOSPlugin): void {
    this.plugins.push(plugin);
    if (plugin.onInitialize) {
      plugin.onInitialize();
    }
  }

  public async notifyPushReceived(
    notification: NormalizedNotification
  ): Promise<NormalizedNotification> {
    let current = notification;
    for (const plugin of this.plugins) {
      if (plugin.onPushReceived) {
        try {
          const result = await plugin.onPushReceived(current);
          if (result) {
            current = result;
          }
        } catch (e) {
          console.warn(`[RNNOS PluginManager] Plugin ${plugin.name} failed onPushReceived`, e);
        }
      }
    }
    return current;
  }

  public notifyNotificationTapped(notification: NormalizedNotification, actionId?: string): void {
    this.plugins.forEach((plugin) => {
      if (plugin.onNotificationTapped) {
        try {
          plugin.onNotificationTapped(notification, actionId);
        } catch (e) {
          console.warn(`[RNNOS PluginManager] Plugin ${plugin.name} failed onNotificationTapped`, e);
        }
      }
    });
  }

  public notifyNotificationDismissed(notificationId: string): void {
    this.plugins.forEach((plugin) => {
      if (plugin.onNotificationDismissed) {
        try {
          plugin.onNotificationDismissed(notificationId);
        } catch (e) {
          console.warn(`[RNNOS PluginManager] Plugin ${plugin.name} failed onNotificationDismissed`, e);
        }
      }
    });
  }
}

export const defaultPluginManager = new PluginManager();
