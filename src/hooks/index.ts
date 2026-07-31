import { useEffect, useState } from 'react';
import { NormalizedNotification, ChatConversation, CommerceProgress } from '../types/NormalizedNotification';
import { defaultChatEngine } from '../engines/ChatEngine';
import { defaultCommerceEngine } from '../engines/CommerceEngine';
import { defaultBadgeEngine } from '../engines/BadgeEngine';
import { RNNOSCore } from '../core/RNNOSCore';

export function useNotificationListener(
  onReceived?: (notification: NormalizedNotification) => void,
  onTapped?: (notification: NormalizedNotification, actionId?: string) => void
) {
  useEffect(() => {
    const unsubReceived = onReceived ? RNNOSCore.onNotificationReceived(onReceived) : undefined;
    const unsubTapped = onTapped ? RNNOSCore.onNotificationTapped(onTapped) : undefined;

    return () => {
      if (unsubReceived) unsubReceived();
      if (unsubTapped) unsubTapped();
    };
  }, [onReceived, onTapped]);
}

export function useChatThread(threadId: string) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);

  useEffect(() => {
    // Set active thread for auto mark-as-read and notification suppression
    defaultChatEngine.setActiveThread(threadId);

    const unsubscribe = defaultChatEngine.subscribeThread(threadId, (conv) => {
      setConversation(conv);
    });

    return () => {
      defaultChatEngine.setActiveThread(null);
      unsubscribe();
    };
  }, [threadId]);

  const markRead = () => {
    defaultChatEngine.markThreadAsRead(threadId);
  };

  return { conversation, markRead };
}

export function useCommerceOrder(orderId: string) {
  const [progress, setProgress] = useState<CommerceProgress | undefined>(
    defaultCommerceEngine.getOrderProgress(orderId)
  );

  useEffect(() => {
    const unsubscribe = defaultCommerceEngine.subscribeOrder(orderId, (newProgress) => {
      setProgress(newProgress);
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  return { progress };
}

export function useUnreadCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = defaultBadgeEngine.subscribeBadge((newCount) => {
      setCount(newCount);
    });

    defaultBadgeEngine.getBadgeCount().then(setCount);

    return () => {
      unsubscribe();
    };
  }, []);

  return { unreadCount: count, setBadgeCount: (c: number) => defaultBadgeEngine.setBadgeCount(c) };
}
