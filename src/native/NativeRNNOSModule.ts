import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Initialization & Configuration
  initialize(configJson: string): Promise<boolean>;
  requestNotificationPermission(): Promise<boolean>;
  checkPermissionStatus(): Promise<'GRANTED' | 'DENIED' | 'NOT_DETERMINED'>;
  openNotificationSettings(): Promise<boolean>;
  getFCMToken(): Promise<string>;
  
  // Notification Management
  presentNotification(notificationJson: string): Promise<boolean>;
  dismissNotification(id: string): Promise<boolean>;
  dismissAllNotifications(): Promise<boolean>;
  getDeliveredNotifications(): Promise<string>; // JSON array of NormalizedNotification
  
  // Channels (Android)
  createChannel(channelJson: string): Promise<boolean>;
  
  // Badge Operations
  setBadgeCount(count: number): Promise<boolean>;
  getBadgeCount(): Promise<number>;
  
  // Storage & History
  getNotificationHistory(limit: number, offset: number): Promise<string>;
  clearNotificationHistory(): Promise<boolean>;
  
  // Event Emitter Support
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNNOSTurboModule');
