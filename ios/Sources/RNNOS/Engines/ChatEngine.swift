import Foundation
import UserNotifications

public final class ChatEngine {
    public static let shared = ChatEngine()
    
    public var activeThreadId: String?

    private var conversations: [String: ChatConversation] = [:]
    private val lock = NSLock()

    private init() {}

    public func setActiveThread(threadId: String?) {
        lock.lock()
        activeThreadId = threadId
        lock.unlock()
        
        if let threadId = threadId {
            markThreadAsRead(threadId: threadId)
        }
    }

    public func processChatMessage(notification: NormalizedNotification) {
        guard let threadId = notification.threadId else { return }

        lock.lock()
        let existing = conversations[threadId]
        var messages = existing?.messages ?? []

        if let chatMeta = notification.chatMetadata {
            messages.append(contentsOf: chatMeta.messages)
        } else {
            messages.append(
                ChatMessage(
                    id: notification.messageId,
                    text: notification.body,
                    timestamp: notification.timestamp,
                    senderId: notification.id,
                    senderName: notification.title,
                    senderAvatar: notification.avatar
                )
            )
        }

        let updatedConversation = ChatConversation(
            threadId: threadId,
            senderId: notification.chatMetadata?.senderId ?? notification.id,
            senderName: notification.chatMetadata?.senderName ?? notification.title,
            senderAvatar: notification.chatMetadata?.senderAvatar ?? notification.avatar,
            isGroup: notification.chatMetadata?.isGroup ?? false,
            groupName: notification.chatMetadata?.groupName ?? notification.subtitle,
            messages: messages,
            unreadCount: (activeThreadId == threadId) ? 0 : ((existing?.unreadCount ?? 0) + 1)
        )

        conversations[threadId] = updatedConversation
        let currentActive = activeThreadId
        lock.unlock()

        if currentActive == threadId {
            // User is currently reading thread -> suppress banner
            return
        }

        NotificationRenderer.shared.render(notification: notification)
    }

    public func markThreadAsRead(threadId: String) {
        lock.lock()
        if var conv = conversations[threadId] {
            conv = ChatConversation(
                threadId: conv.threadId,
                senderId: conv.senderId,
                senderName: conv.senderName,
                senderAvatar: conv.senderAvatar,
                isGroup: conv.isGroup,
                groupName: conv.groupName,
                messages: conv.messages,
                unreadCount: 0
            )
            conversations[threadId] = conv
        }
        lock.unlock()

        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [threadId])
    }
}
