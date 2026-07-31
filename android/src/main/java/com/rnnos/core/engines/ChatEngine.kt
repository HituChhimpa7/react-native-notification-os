package com.rnnos.core.engines

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import com.rnnos.core.domain.model.ChatConversation
import com.rnnos.core.domain.model.ChatMessage
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationAction
import com.rnnos.core.domain.model.NotificationType
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

object ChatEngine {

    @Volatile
    var activeThreadId: String? = null

    // In-memory store for active conversations (ThreadId -> Conversation)
    private val conversations = ConcurrentHashMap<String, ChatConversation>()

    fun setActiveThread(context: Context, threadId: String?) {
        activeThreadId = threadId
        if (!threadId.isNullOrEmpty()) {
            markThreadAsRead(context, threadId)
        }
    }

    fun shouldSuppressNotification(notification: NormalizedNotification): Boolean {
        if (notification.type == NotificationType.CHAT && !notification.threadId.isNullOrEmpty()) {
            if (notification.threadId == activeThreadId) {
                return true
            }
        }
        return false
    }

    fun processChatMessage(context: Context, notification: NormalizedNotification) {
        val threadId = notification.threadId ?: return
        val incomingChatMeta = notification.chatMetadata

        val existing = conversations[threadId]
        val messageMap = LinkedHashMap<String, ChatMessage>()

        if (existing != null) {
            existing.messages.forEach { messageMap[it.id] = it }
        }

        if (incomingChatMeta != null) {
            incomingChatMeta.messages.forEach { messageMap[it.id] = it }
        } else {
            messageMap[notification.messageId] = ChatMessage(
                id = notification.messageId,
                text = notification.body,
                timestamp = notification.timestamp,
                senderId = notification.id,
                senderName = notification.title
            )
        }

        val updatedMessages = messageMap.values.toMutableList()

        val updatedConversation = ChatConversation(
            threadId = threadId,
            senderId = incomingChatMeta?.senderId ?: notification.id,
            senderName = incomingChatMeta?.senderName ?: notification.title,
            senderAvatar = incomingChatMeta?.senderAvatar ?: notification.avatar,
            isGroup = incomingChatMeta?.isGroup ?: false,
            groupName = incomingChatMeta?.groupName ?: notification.subtitle,
            messages = updatedMessages,
            unreadCount = if (threadId == activeThreadId) 0 else ((existing?.unreadCount ?: 0) + 1)
        )

        conversations[threadId] = updatedConversation

        val updatedNotification = notification.copy(
            chatMetadata = updatedConversation
        )

        if (shouldSuppressNotification(updatedNotification)) {
            // Suppressed because user is currently in active chat
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            NotificationRenderer.render(context, updatedNotification, isSilentUpdate = false)
        }
    }

    fun appendUserReply(context: Context, threadId: String, replyText: String) {
        val existing = conversations[threadId]
        val messages = mutableListOf<ChatMessage>()
        if (existing != null) {
            messages.addAll(existing.messages)
        }

        val isDuplicate = messages.any {
            it.senderId == "user_me" && it.text == replyText && Math.abs(it.timestamp - System.currentTimeMillis()) < 3000
        }

        if (!isDuplicate) {
            messages.add(
                ChatMessage(
                    id = "reply_${System.currentTimeMillis()}",
                    text = replyText,
                    timestamp = System.currentTimeMillis(),
                    senderId = "user_me",
                    senderName = "Me"
                )
            )
        }

        val updatedConversation = ChatConversation(
            threadId = threadId,
            senderId = existing?.senderId ?: "user_me",
            senderName = existing?.senderName ?: "Me",
            isGroup = existing?.isGroup ?: false,
            groupName = existing?.groupName,
            messages = messages,
            unreadCount = 0
        )

        conversations[threadId] = updatedConversation

        val defaultActions = listOf(
            NotificationAction(
                id = "action_reply",
                title = "Reply",
                type = "TEXT_INPUT",
                placeholder = "Type reply..."
            ),
            NotificationAction(
                id = "action_mark_read",
                title = "Mark Read ✔",
                type = "BUTTON"
            )
        )

        val notification = NormalizedNotification(
            id = threadId,
            messageId = System.currentTimeMillis().toString(),
            threadId = threadId,
            title = existing?.groupName ?: existing?.senderName ?: "Chat",
            body = replyText,
            type = NotificationType.CHAT,
            actions = defaultActions,
            chatMetadata = updatedConversation
        )

        CoroutineScope(Dispatchers.IO).launch {
            NotificationRenderer.render(context, notification, isSilentUpdate = true)
        }
    }

    fun markThreadAsRead(context: Context, threadId: String) {
        val existing = conversations[threadId]
        if (existing != null) {
            conversations[threadId] = existing.copy(unreadCount = 0)
        }
        val notificationManager = NotificationManagerCompat.from(context)
        notificationManager.cancel(threadId.hashCode())
    }
}
