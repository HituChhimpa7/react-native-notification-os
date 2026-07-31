import { NormalizedNotification, ChatMessage, ChatConversation } from '../types/NormalizedNotification';
import NativeRNNOSModule from '../native/NativeRNNOSModule';

export class ChatEngineManager {
  private activeThreadId: string | null = null;
  private threadListeners: Map<string, Array<(conv: ChatConversation) => void>> = new Map();
  private threadStore: Map<string, ChatConversation> = new Map();

  public setActiveThread(threadId: string | null): void {
    this.activeThreadId = threadId;
    if (threadId) {
      this.markThreadAsRead(threadId);
    }
  }

  public getActiveThreadId(): string | null {
    return this.activeThreadId;
  }

  public markThreadAsRead(threadId: string): void {
    const existing = this.threadStore.get(threadId);
    if (existing) {
      const updated: ChatConversation = {
        ...existing,
        unreadCount: 0,
      };
      this.threadStore.set(threadId, updated);
      this.notifyListeners(threadId, updated);
    }
    // Dismiss native notification banner
    NativeRNNOSModule.dismissNotification(threadId).catch(() => {});
  }

  public handleIncomingChatMessage(notification: NormalizedNotification): ChatConversation {
    const threadId = notification.threadId || notification.id;
    const existing = this.threadStore.get(threadId);

    const messageMap = new Map<string, ChatMessage>();

    // Preserve existing messages without duplication
    if (existing?.messages) {
      existing.messages.forEach((msg) => {
        messageMap.set(msg.id, msg);
      });
    }

    // Add/merge incoming messages
    if (notification.chatMetadata?.messages) {
      notification.chatMetadata.messages.forEach((msg) => {
        messageMap.set(msg.id, msg);
      });
    } else {
      const msgId = notification.messageId || notification.id;
      if (!messageMap.has(msgId)) {
        messageMap.set(msgId, {
          id: msgId,
          text: notification.body,
          timestamp: notification.timestamp,
          senderId: notification.id,
          senderName: notification.title,
          senderAvatar: notification.avatar,
        });
      }
    }

    const messages = Array.from(messageMap.values());

    const updatedConversation: ChatConversation = {
      threadId,
      senderId: notification.chatMetadata?.senderId || notification.id,
      senderName: notification.chatMetadata?.senderName || notification.title,
      senderAvatar: notification.chatMetadata?.senderAvatar || notification.avatar,
      isGroup: notification.chatMetadata?.isGroup || false,
      groupName: notification.chatMetadata?.groupName || notification.subtitle,
      messages,
      unreadCount: this.activeThreadId === threadId ? 0 : (existing?.unreadCount || 0) + 1,
    };

    this.threadStore.set(threadId, updatedConversation);
    this.notifyListeners(threadId, updatedConversation);
    return updatedConversation;
  }

  public appendUserReply(
    threadId: string,
    text: string,
    senderId: string = 'user_me',
    senderName: string = 'Me'
  ): ChatConversation | null {
    const existing = this.threadStore.get(threadId);
    const messages: ChatMessage[] = existing ? [...existing.messages] : [];

    // Deduplicate reply if identical text was sent by the same user within 3000ms
    const isDuplicate = messages.some(
      (m) => m.senderId === senderId && m.text === text && Math.abs(m.timestamp - Date.now()) < 3000
    );

    if (isDuplicate && existing) {
      return existing;
    }

    const newMessage: ChatMessage = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      timestamp: Date.now(),
      senderId,
      senderName,
    };

    messages.push(newMessage);

    const updatedConversation: ChatConversation = {
      threadId,
      senderId: existing?.senderId || senderId,
      senderName: existing?.senderName || senderName,
      senderAvatar: existing?.senderAvatar,
      isGroup: existing?.isGroup || false,
      groupName: existing?.groupName,
      messages,
      unreadCount: 0,
    };

    this.threadStore.set(threadId, updatedConversation);
    this.notifyListeners(threadId, updatedConversation);
    return updatedConversation;
  }

  public subscribeThread(threadId: string, callback: (conv: ChatConversation) => void): () => void {
    const current = this.threadListeners.get(threadId) || [];
    this.threadListeners.set(threadId, [...current, callback]);

    const existing = this.threadStore.get(threadId);
    if (existing) {
      callback(existing);
    }

    return () => {
      const list = this.threadListeners.get(threadId) || [];
      this.threadListeners.set(
        threadId,
        list.filter((cb) => cb !== callback)
      );
    };
  }

  private notifyListeners(threadId: string, conv: ChatConversation): void {
    const listeners = this.threadListeners.get(threadId) || [];
    listeners.forEach((cb) => cb(conv));
  }
}

export const defaultChatEngine = new ChatEngineManager();
