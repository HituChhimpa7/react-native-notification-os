import { RNNOSCore } from './core/RNNOSCore';
import { defaultChatEngine } from './engines/ChatEngine';
import { defaultCommerceEngine } from './engines/CommerceEngine';
import { defaultBadgeEngine } from './engines/BadgeEngine';
import { defaultRulesEngine } from './core/RulesEngine';
import { defaultSmartRouter } from './core/SmartRouter';
import { defaultPluginManager } from './plugins/PluginManager';

export * from './types';
export * from './hooks';

export const RNNOS = {
  // Initialization
  initialize: RNNOSCore.initialize.bind(RNNOSCore),
  
  // Primary Operations
  presentNotification: RNNOSCore.presentNotification.bind(RNNOSCore),
  dismissNotification: RNNOSCore.dismissNotification.bind(RNNOSCore),
  dismissAllNotifications: RNNOSCore.dismissAllNotifications.bind(RNNOSCore),
  getDeliveredNotifications: RNNOSCore.getDeliveredNotifications.bind(RNNOSCore),
  getNotificationHistory: RNNOSCore.getNotificationHistory.bind(RNNOSCore),
  clearNotificationHistory: RNNOSCore.clearNotificationHistory.bind(RNNOSCore),
  requestPermission: RNNOSCore.requestPermission.bind(RNNOSCore),
  checkPermissionStatus: RNNOSCore.checkPermissionStatus.bind(RNNOSCore),
  openNotificationSettings: RNNOSCore.openNotificationSettings.bind(RNNOSCore),
  getFCMToken: RNNOSCore.getFCMToken.bind(RNNOSCore),
  onTokenRefresh: RNNOSCore.onTokenRefresh.bind(RNNOSCore),
  onNotificationReceived: RNNOSCore.onNotificationReceived.bind(RNNOSCore),
  onNotificationTapped: RNNOSCore.onNotificationTapped.bind(RNNOSCore),
  setNavigationHandler: RNNOSCore.setNavigationHandler.bind(RNNOSCore),

  // Engines
  Chat: defaultChatEngine,
  Commerce: defaultCommerceEngine,
  Badge: defaultBadgeEngine,
  Rules: defaultRulesEngine,
  Router: defaultSmartRouter,
  Plugins: defaultPluginManager,
};

export default RNNOS;
