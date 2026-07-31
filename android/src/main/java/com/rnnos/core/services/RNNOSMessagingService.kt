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
import org.json.JSONObject

class RNNOSMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // ─────────────────────────────────────────────────────────────────────
        // FCM PAYLOAD BEHAVIOR — IMPORTANT:
        //
        // Case 1: data only           → onMessageReceived() always called ✅
        // Case 2: notification only   → onMessageReceived() called only in Foreground.
        //                               System auto-shows banner in Background/Killed.
        // Case 3: BOTH keys present   → onMessageReceived() called ONLY in Foreground.
        //                               System auto-shows banner in Background/Killed
        //                               using notification.title/body + default channel.
        //                               Our custom RNNOS banner logic runs only in Foreground.
        //
        // RECOMMENDATION: Always use data-only payloads for full RNNOS control.
        // ─────────────────────────────────────────────────────────────────────

        try {
            var notification: NormalizedNotification? = null

            val hasData = remoteMessage.data.isNotEmpty()
            val hasFCMNotif = remoteMessage.notification != null

            when {
                // ── Case 1 & 3: data key present (alone OR alongside notification key)
                // data always takes priority. If title/body missing in data,
                // fall back to notification.title / notification.body
                hasData -> {
                    val jsonMap = remoteMessage.data.toMutableMap()

                    // Merge notification key fields as fallback (don't overwrite data fields)
                    if (hasFCMNotif) {
                        if (!jsonMap.containsKey("title") && remoteMessage.notification?.title != null) {
                            jsonMap["title"] = remoteMessage.notification!!.title!!
                        }
                        if (!jsonMap.containsKey("body") && remoteMessage.notification?.body != null) {
                            jsonMap["body"] = remoteMessage.notification!!.body!!
                        }
                    }

                    val jsonStr = JSONObject(jsonMap as Map<*, *>).toString()
                    notification = NormalizedNotification.fromJsonString(jsonStr)
                }

                // ── Case 2: notification key only (e.g. Firebase Console Web GUI test)
                // onMessageReceived only fires in Foreground for this case.
                hasFCMNotif -> {
                    notification = NormalizedNotification(
                        id = remoteMessage.messageId ?: "fcm_${System.currentTimeMillis()}",
                        messageId = remoteMessage.messageId ?: "fcm_${System.currentTimeMillis()}",
                        title = remoteMessage.notification?.title ?: "New Notification",
                        body = remoteMessage.notification?.body ?: "",
                        type = NotificationType.GENERIC,
                        priority = com.rnnos.core.domain.model.NotificationPriority.HIGH,
                        category = remoteMessage.notification?.channelId ?: "rnnos_default_channel",
                        timestamp = System.currentTimeMillis()
                    )
                }
            }

            if (notification != null) {
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
                            NotificationRenderer.render(
                                applicationContext,
                                targetNotif,
                                isSilentUpdate = targetNotif.silentUpdate
                            )
                        }
                    }
                }

                // Notify React Native JS layer (works when app is in foreground)
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
