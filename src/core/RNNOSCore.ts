import { DeviceEventEmitter } from 'react-native';
import {
  NormalizedNotification,
  RNNOSConfig,
} from '../types/NormalizedNotification';
import NativeRNNOSModule from '../native/NativeRNNOSModule';
import { defaultRulesEngine, RulesEngine } from './RulesEngine';
import { defaultSmartRouter, SmartRouter } from './SmartRouter';
import { defaultPluginManager, PluginManager } from '../plugins/PluginManager';
import { defaultChatEngine } from '../engines/ChatEngine';
import { defaultCommerceEngine } from '../engines/CommerceEngine';
import { defaultBadgeEngine } from '../engines/BadgeEngine';

export class RNNOSCoreClass {
  private isInitialized = false;
  private rulesEngine: RulesEngine = defaultRulesEngine;
  private smartRouter: SmartRouter = defaultSmartRouter;
  private pluginManager: PluginManager = defaultPluginManager;

  private receivedListeners: Array<(notification: NormalizedNotification) => void> = [];
  private tappedListeners: Array<(notification: NormalizedNotification, actionId?: string) => void> = [];

  public async initialize(config: RNNOSConfig): Promise<boolean> {
    if (this.isInitialized) return true;

    // Automatic zero-config permission request & FCM Token retrieval
    try {
      await this.requestPermission();
      const token = await this.getFCMToken();
      if (token) {
        console.log('[RNNOS Core] Automatic FCM Token retrieved:', token);
      }
    } catch (_e) {}

    DeviceEventEmitter.removeAllListeners('RNNOS_InlineReply');
    DeviceEventEmitter.addListener('RNNOS_InlineReply', ({ threadId, replyText }) => {
      if (threadId && replyText) {
        defaultChatEngine.appendUserReply(threadId, replyText);
      }
    });

    if (config.rules) {
      config.rules.forEach((rule) => this.rulesEngine.registerRule(rule));
    }

    if (config.plugins) {
      config.plugins.forEach((plugin) => this.pluginManager.registerPlugin(plugin));
    }

    if (config.channels) {
      for (const ch of config.channels) {
        await NativeRNNOSModule.createChannel(JSON.stringify(ch));
      }
    }

    try {
      const res = await NativeRNNOSModule.initialize(JSON.stringify(config));
      this.isInitialized = res;
      return res;
    } catch (e) {
      console.warn('[RNNOS Core] Initialize fallback', e);
      this.isInitialized = true;
      return true;
    }
  }

  public async presentNotification(rawNotification: NormalizedNotification): Promise<boolean> {
    // 1. Plugin Hook: Push Received
    const notification = await this.pluginManager.notifyPushReceived(rawNotification);

    // 2. Evaluate Rules Engine
    const activeChatId = defaultChatEngine.getActiveThreadId() || undefined;
    const ruleResult = this.rulesEngine.evaluate(notification, {
      activeChatId,
      isForeground: true,
    });

    if (ruleResult.action === 'SUPPRESS' || ruleResult.action === 'SUPPRESS_AND_INJECT') {
      // In-app silent message processing without system tray alert
      if (notification.type === 'CHAT') {
        defaultChatEngine.handleIncomingChatMessage(notification);
      }
      this.notifyReceivedListeners(notification);
      return false;
    }

    // 3. Dispatch to Specialized Domain Engines
    if (notification.type === 'CHAT') {
      defaultChatEngine.handleIncomingChatMessage(notification);
    } else if (notification.type === 'COMMERCE') {
      defaultCommerceEngine.handleOrderUpdate(notification);
    }

    // 4. Update Badge
    if (notification.badge !== undefined) {
      defaultBadgeEngine.setBadgeCount(notification.badge);
    } else {
      defaultBadgeEngine.incrementBadge(1);
    }

    // 5. Present natively via TurboModule
    try {
      const success = await NativeRNNOSModule.presentNotification(JSON.stringify(notification));
      this.notifyReceivedListeners(notification);
      return success;
    } catch (e) {
      console.warn('[RNNOS Core] Failed native presentNotification', e);
      this.notifyReceivedListeners(notification);
      return false;
    }
  }

  public async dismissNotification(id: string): Promise<boolean> {
    try {
      return await NativeRNNOSModule.dismissNotification(id);
    } catch (e) {
      console.warn('[RNNOS Core] Failed dismissNotification', e);
      return false;
    }
  }

  public async dismissAllNotifications(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.dismissAllNotifications();
    } catch (e) {
      console.warn('[RNNOS Core] Failed dismissAllNotifications', e);
      return false;
    }
  }

  public async getDeliveredNotifications(): Promise<NormalizedNotification[]> {
    try {
      const json = await NativeRNNOSModule.getDeliveredNotifications();
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.warn('[RNNOS Core] Failed getDeliveredNotifications', e);
      return [];
    }
  }

  public async getNotificationHistory(limit = 50, offset = 0): Promise<NormalizedNotification[]> {
    try {
      const json = await NativeRNNOSModule.getNotificationHistory(limit, offset);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.warn('[RNNOS Core] Failed getNotificationHistory', e);
      return [];
    }
  }

  public async clearNotificationHistory(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.clearNotificationHistory();
    } catch (e) {
      console.warn('[RNNOS Core] Failed clearNotificationHistory', e);
      return false;
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.requestNotificationPermission();
    } catch (e) {
      console.warn('[RNNOS Core] Failed requestPermission', e);
      return false;
    }
  }

  public async checkPermissionStatus(): Promise<'GRANTED' | 'DENIED' | 'NOT_DETERMINED'> {
    try {
      return await NativeRNNOSModule.checkPermissionStatus();
    } catch (e) {
      console.warn('[RNNOS Core] Failed checkPermissionStatus', e);
      return 'DENIED';
    }
  }

  public async openNotificationSettings(): Promise<boolean> {
    try {
      return await NativeRNNOSModule.openNotificationSettings();
    } catch (e) {
      console.warn('[RNNOS Core] Failed openNotificationSettings', e);
      return false;
    }
  }

  public async getFCMToken(): Promise<string> {
    try {
      return await NativeRNNOSModule.getFCMToken();
    } catch (e) {
      console.warn('[RNNOS Core] Failed getFCMToken', e);
      return '';
    }
  }

  public onTokenRefresh(callback: (token: string) => void): () => void {
    const subscription = DeviceEventEmitter.addListener('RNNOS_FCMTokenRefresh', ({ token }) => {
      if (token) callback(token);
    });
    return () => subscription.remove();
  }

  public handleNotificationTap(notification: NormalizedNotification, actionId?: string): void {
    this.pluginManager.notifyNotificationTapped(notification, actionId);
    this.smartRouter.handleNotificationTap(notification, actionId);
    this.tappedListeners.forEach((cb) => cb(notification, actionId));
  }

  public setNavigationHandler(handler: (deepLink: string, data: Record<string, any>) => void): void {
    this.smartRouter.setNavigationHandler(handler);
  }

  public onNotificationReceived(callback: (notification: NormalizedNotification) => void): () => void {
    this.receivedListeners.push(callback);
    return () => {
      this.receivedListeners = this.receivedListeners.filter((cb) => cb !== callback);
    };
  }

  public onNotificationTapped(
    callback: (notification: NormalizedNotification, actionId?: string) => void
  ): () => void {
    this.tappedListeners.push(callback);
    return () => {
      this.tappedListeners = this.tappedListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyReceivedListeners(notification: NormalizedNotification): void {
    this.receivedListeners.forEach((cb) => cb(notification));
  }
}

export const RNNOSCore = new RNNOSCoreClass();
