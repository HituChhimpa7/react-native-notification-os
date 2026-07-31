package com.rnnos.core.services

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.rnnos.RNNOSTurboModule
import com.rnnos.core.domain.model.NormalizedNotification
import com.rnnos.core.domain.model.NotificationType
import com.rnnos.core.engines.ChatEngine
import com.rnnos.core.engines.CommerceEngine
import com.rnnos.core.renderers.NotificationRenderer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class RNNOSMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        try {
            var notification: NormalizedNotification? = null

            if (remoteMessage.data.isNotEmpty()) {
                val jsonMap = remoteMessage.data
                val jsonStr = org.json.JSONObject(jsonMap as Map<*, *>).toString()
                notification = NormalizedNotification.fromJsonString(jsonStr)
            } else if (remoteMessage.notification != null) {
                // Support Firebase Console Web GUI notifications
                notification = NormalizedNotification(
                    id = remoteMessage.messageId ?: "fcm_${System.currentTimeMillis()}",
                    messageId = remoteMessage.messageId ?: "fcm_${System.currentTimeMillis()}",
                    title = remoteMessage.notification?.title ?: "New Notification",
                    body = remoteMessage.notification?.body ?: "",
                    type = NotificationType.GENERIC,
                    priority = com.rnnos.core.domain.model.NotificationPriority.HIGH,
                    category = "chat_messages",
                    timestamp = System.currentTimeMillis()
                )
            }

            if (notification != null) {
                // Render Heads-Up Pop-up Notification in all app states (Foreground, Background, Killed)
                val targetNotif = notification
                when (targetNotif.type) {
                    NotificationType.CHAT -> {
                        ChatEngine.processChatMessage(applicationContext, targetNotif)
                    }
                    NotificationType.COMMERCE -> {
                        CommerceEngine.updateOrderProgress(applicationContext, targetNotif)
                    }
                    else -> {
                        CoroutineScope(Dispatchers.IO).launch {
                            NotificationRenderer.render(applicationContext, targetNotif, isSilentUpdate = targetNotif.silentUpdate)
                        }
                    }
                }

                // Notify React Native JS Layer if app is in foreground
                RNNOSTurboModule.sendNotificationReceivedEvent(targetNotif)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        RNNOSTurboModule.sendTokenRefreshEvent(token)
    }
}
