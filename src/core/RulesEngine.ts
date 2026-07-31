import { NormalizedNotification, NotificationRule, RuleResult } from '../types/NormalizedNotification';

export class RulesEngine {
  private rules: NotificationRule[] = [];

  public registerRule(rule: NotificationRule): void {
    this.rules.push(rule);
  }

  public evaluate(
    notification: NormalizedNotification,
    appState: { activeChatId?: string; isForeground: boolean }
  ): RuleResult {
    // 1. Built-in Active Chat Suppression Rule
    if (
      notification.type === 'CHAT' &&
      notification.threadId &&
      notification.threadId === appState.activeChatId
    ) {
      return {
        action: 'SUPPRESS_AND_INJECT',
        reason: 'User is actively viewing target chat thread',
      };
    }

    // 2. Custom Registered Rules
    for (const rule of this.rules) {
      try {
        if (rule.condition(notification, appState)) {
          return {
            action: rule.action,
            reason: `Triggered rule: ${rule.id}`,
          };
        }
      } catch (e) {
        console.warn(`[RNNOS RulesEngine] Error evaluating rule ${rule.id}:`, e);
      }
    }

    return {
      action: 'PRESENT',
    };
  }
}

export const defaultRulesEngine = new RulesEngine();
